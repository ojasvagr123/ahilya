# app/ml_service.py
from __future__ import annotations
from pathlib import Path
from functools import lru_cache
from typing import Literal, Dict, Any, List, Optional
import re
from urllib.parse import urlparse

import numpy as np
import pandas as pd
import scipy.sparse as sp
import joblib
import os

# Optional imports used only if the new pipelines are called
try:
    import torch, timm  # for deepfake .pt
    from PIL import Image
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
except Exception:
    torch = None
    timm = None
    Image = None
    A = None
    ToTensorV2 = None

try:
    import onnxruntime as ort  # for deepfake .onnx fallback
except Exception:
    ort = None

# ------------------------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------------------------
TypeLit = Literal["SMS", "VOIP", "URL"]
ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"

# IMPORTANT: match the rest of your backend which uses "uploads"
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(ROOT / "uploads"))).resolve()

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
CSV_EXTS = {".csv"}

# ------------------------------------------------------------------------------------
# Old artifacts (kept)
# ------------------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _artifacts():
    return {
        "sms_model": joblib.load(MODELS_DIR / "sms_spam_model.pkl"),
        "sms_vec":   joblib.load(MODELS_DIR / "sms_vectorizer.pkl"),
        "url_model": joblib.load(MODELS_DIR / "url_spam_model.pkl"),
        "url_vec":   joblib.load(MODELS_DIR / "url_vectorizer.pkl"),
        "voip_model": joblib.load(MODELS_DIR / "cold_model.pkl"),
    }

# ------------------------------------------------------------------------------------
# SMS / URL / VOIP helpers (kept)
# ------------------------------------------------------------------------------------
def sms_transform(text: str):
    A_ = _artifacts()
    return A_["sms_vec"].transform([text])

SUSPICIOUS = ["login","update","verify","secure","bank","account","confirm","ebay","paypal","signin"]
URL_FEAT_ORDER = [
    "url_length","domain_length","path_length","num_dots","num_digits","num_special",
    "https_present","ip_present","num_subdomains","keyword_count","entropy",
    "has_at_symbol","has_hyphen","num_query_params","is_numeric_domain"
]

def url_numeric_features(url: str) -> np.ndarray:
    url = url or ""
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    keyword_count = sum(kw in url.lower() for kw in SUSPICIOUS)
    if len(url) == 0:
        entropy = 0.0
    else:
        probs = [url.count(c)/len(url) for c in set(url)]
        entropy = float(-sum(p * np.log2(p) for p in probs))
    feats = {
        "url_length": len(url),
        "domain_length": len(domain),
        "path_length": len(path),
        "num_dots": url.count('.'),
        "num_digits": sum(c.isdigit() for c in url),
        "num_special": sum(not c.isalnum() for c in url),
        "https_present": int(url.startswith("https")),
        "ip_present": int(bool(re.search(r'\d+\.\d+\.\d+\.\d+', url))),
        "num_subdomains": domain.count('.') - 1,
        "keyword_count": keyword_count,
        "entropy": entropy,
        "has_at_symbol": int('@' in url),
        "has_hyphen": int('-' in domain),
        "num_query_params": url.count('='),
        "is_numeric_domain": int(domain.replace('.', '').isdigit()),
    }
    return np.array([feats[k] for k in URL_FEAT_ORDER], dtype=float)

def url_transform(url: str):
    A_ = _artifacts()
    X_tfidf = A_["url_vec"].transform([str(url)])  # (1, N)
    x_num = url_numeric_features(url).reshape(1, -1)  # (1, 15)
    X = sp.hstack([X_tfidf, sp.csr_matrix(x_num)])
    return X

VOIP_FEATS = ["CountryCode","Length","UniqueDigits","Entropy","StartsWith140","RepeatScore"]

def voip_cold_features(number: str) -> pd.DataFrame:
    digits = ''.join(filter(str.isdigit, number or ""))
    if len(digits) < 2:
        digits = "00"
    length = len(digits)
    unique_digits = len(set(digits))
    if length == 0:
        entropy = 0.0
    else:
        probs = [(digits.count(d)/length) for d in set(digits)]
        entropy = float(-sum(p*np.log2(p) for p in probs))
    sw140 = 1 if digits.startswith("91140") or digits.startswith("140") else 0
    repeat_score = sum(digits.count(d)**2 for d in set(digits))
    cc = int(digits[:2])
    return pd.DataFrame([[cc, length, unique_digits, entropy, sw140, repeat_score]], columns=VOIP_FEATS)

# ------------------------------------------------------------------------------------
# Deepfake
# ------------------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _deepfake_backend():
    """
    Prefer ONNX if available and onnxruntime imports; else fall back to Torch.
    Auto-discovers model filenames in models/.
    """
    image_size = 256  # must match training

    onnx_cands = sorted(MODELS_DIR.glob("*.onnx"))
    pt_cands   = sorted(MODELS_DIR.glob("*.pt"))

    # Try ONNX first
    if ort is not None and onnx_cands:
        onnx_path = onnx_cands[0]
        try:
            providers = getattr(ort, "get_available_providers", lambda: ["CPUExecutionProvider"])()
            # If CUDA is available it will be included automatically by the GPU build.
            sess = ort.InferenceSession(str(onnx_path), providers=providers)
            print(f"[deepfake] Using ONNX: {onnx_path.name}, providers={providers}")
            return {"type": "onnx", "sess": sess, "size": image_size}
        except Exception as e:
            # Log and continue to Torch fallback
            print(f"[deepfake] ONNX load failed for {onnx_path}: {e}")

    # Fallback to Torch
    if (torch is not None) and (timm is not None) and pt_cands:
        pt_path = pt_cands[0]
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = timm.create_model("efficientvit_b0", pretrained=False, num_classes=1)
        state = torch.load(pt_path, map_location=device)
        model.load_state_dict(state)
        model.eval().to(device)
        print(f"[deepfake] Using Torch: {pt_path.name} on {device}")
        return {"type": "torch", "model": model, "device": device, "size": image_size}

    # Nothing usable
    msg = []
    msg.append(f"onnxruntime={'ok' if ort is not None else 'missing'} cands={len(onnx_cands)}")
    msg.append(f"torch={'ok' if torch is not None else 'missing'} timm={'ok' if timm is not None else 'missing'} pt_files={len(pt_cands)}")
    raise RuntimeError("Deepfake model not available. " + " | ".join(msg))

def _deepfake_transformer(size: int):
    if A is None or ToTensorV2 is None:
        raise RuntimeError("Albumentations not available for deepfake preprocessing.")
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std  = [0.229, 0.224, 0.225]
    return A.Compose([A.Resize(size, size), A.Normalize(mean=imagenet_mean, std=imagenet_std), ToTensorV2()])

def classify_deepfake(image_path: Path) -> Dict[str, Any]:
    be = _deepfake_backend()
    tfm = _deepfake_transformer(be["size"])
    if Image is None:
        raise RuntimeError("Pillow not available to load images.")

    img = Image.open(image_path).convert("RGB")
    arr = np.array(img)
    t = tfm(image=arr)["image"]  # C,H,W torch tensor

    if be["type"] == "onnx":
        x = t.unsqueeze(0).numpy()  # 1,C,H,W
        # Resolve real input/output names instead of hardcoding
        input_name = be["sess"].get_inputs()[0].name
        output_name = be["sess"].get_outputs()[0].name
        logits = be["sess"].run([output_name], {input_name: x})[0]
        # handle possible shapes (1,1) or (1,)
        logit = float(np.ravel(logits)[0])
        prob = 1.0 / (1.0 + np.exp(-logit))
    else:
        model = be["model"]; device = be["device"]
        x = t.unsqueeze(0).to(device)
        with torch.no_grad():
            if device.type == "cuda":
                with torch.cuda.amp.autocast():
                    logits = model(x)
            else:
                logits = model(x)
            prob = torch.sigmoid(logits)[0, 0].item()

    is_fake = prob >= 0.5
    conf = prob if is_fake else (1.0 - prob)
    return {
        "model": "deepfake",
        "prediction": "deepfake" if is_fake else "real",
        "score": float(conf),
        "raw_prob_fake": float(prob)
    }

# ------------------------------------------------------------------------------------
# Malware (kept)
# ------------------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _malware_model():
    p = MODELS_DIR / "rf-model-mh100.pkl"
    if not p.exists():
        raise RuntimeError("Malware model rf-model-mh100.pkl not found in models/")
    return joblib.load(p)

def classify_malware(csv_path: Path) -> Dict[str, Any]:
    model = _malware_model()
    df = pd.read_csv(csv_path)

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(df)
        if proba.shape[1] == 2:
            try:
                classes = list(model.classes_)
                label_idx = classes.index(1) if 1 in classes else classes.index("malicious")
            except Exception:
                label_idx = 1
            p_mal = float(proba[:, label_idx].mean())
        else:
            p_mal = float(proba.max(axis=1).mean())
        label = "malicious" if p_mal >= 0.5 else "benign"
        conf = p_mal if label == "malicious" else (1.0 - p_mal)
        return {"model": "malware", "prediction": label, "score": float(conf), "raw_prob_malicious": float(p_mal)}

    pred = model.predict(df)
    if hasattr(pred, "astype"):
        pred = pred.astype(int)
    p_mal = float(np.mean(pred))
    label = "malicious" if p_mal >= 0.5 else "benign"
    conf = p_mal if label == "malicious" else (1.0 - p_mal)
    return {"model": "malware", "prediction": label, "score": float(conf), "raw_prob_malicious": float(p_mal)}

# ------------------------------------------------------------------------------------
# Unified file runner
# ------------------------------------------------------------------------------------
def run_file(path: str, model: Literal["auto","deepfake","malware"]="auto") -> Dict[str, Any]:
    p = Path(path)
    if not p.is_absolute():
        p = (UPLOAD_DIR / p).resolve()

    if not p.exists() or not p.is_file():
        raise FileNotFoundError(f"File not found: {p}")

    ext = p.suffix.lower()
    if model == "auto":
        if ext in IMAGE_EXTS:
            model = "deepfake"
        elif ext in CSV_EXTS:
            model = "malware"
        else:
            raise ValueError(f"Unsupported file type for auto: {ext}")

    if model == "deepfake":
        if ext not in IMAGE_EXTS:
            raise ValueError(f"Deepfake model requires an image. Got {ext}")
        res = classify_deepfake(p)
    elif model == "malware":
        if ext not in CSV_EXTS:
            raise ValueError(f"Malware model requires a CSV. Got {ext}")
        res = classify_malware(p)
    else:
        raise ValueError(f"Unknown model: {model}")

    res["path"] = str(p)
    return res

# ------------------------------------------------------------------------------------
# Existing service API (kept)
# ------------------------------------------------------------------------------------
class MLService:
    def predict_one(self, text: str, typ: TypeLit) -> Dict[str, Any]:
        A_ = _artifacts()

        if typ == "SMS":
            X = sms_transform(text)
            proba = A_["sms_model"].predict_proba(X)[0]
            idx = int(np.argmax(proba))
            cls = A_["sms_model"].classes_[idx]
            return {"prediction": str(cls), "score": float(proba[idx]), "model": "SMS", "version": "v1"}

        if typ == "URL":
            X = url_transform(text)
            proba = A_["url_model"].predict_proba(X)[0]
            idx = int(np.argmax(proba))
            cls = A_["url_model"].classes_[idx]
            return {"prediction": str(cls), "score": float(proba[idx]), "model": "URL", "version": "v1"}

        if typ == "VOIP":
            X = voip_cold_features(text)
            if hasattr(A_["voip_model"], "predict_proba"):
                proba = A_["voip_model"].predict_proba(X)[0]
                idx = int(np.argmax(proba))
                cls = A_["voip_model"].classes_[idx]
                return {"prediction": str(cls), "score": float(proba[idx]), "model": "VOIP", "version": "v1"}
            pred = A_["voip_model"].predict(X)[0]
            return {"prediction": str(pred), "score": 0.5, "model": "VOIP", "version": "v1"}

        return {"prediction": "unknown", "score": 0.0, "model": str(typ), "version": "v1"}

    def predict_batch(self, items: List[dict]) -> List[dict]:
        out = []
        for it in items:
            res = self.predict_one(it["text"], it["type"])
            if "id" in it:
                res["id"] = it["id"]
            out.append(res)
        return out

service = MLService()
