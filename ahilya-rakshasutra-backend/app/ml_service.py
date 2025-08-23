# app/ml_service.py
from pathlib import Path
from functools import lru_cache
from typing import Literal, Dict, Any, List
import re
from urllib.parse import urlparse

import numpy as np
import pandas as pd
import scipy.sparse as sp
import joblib

TypeLit = Literal["SMS", "VOIP", "URL"]
ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"

# ----- load artifacts once -----
@lru_cache(maxsize=1)
def _artifacts():
    return {
        "sms_model": joblib.load(MODELS_DIR / "sms_spam_model.pkl"),
        "sms_vec":   joblib.load(MODELS_DIR / "sms_vectorizer.pkl"),
        "url_model": joblib.load(MODELS_DIR / "url_spam_model.pkl"),
        "url_vec":   joblib.load(MODELS_DIR / "url_vectorizer.pkl"),
        "voip_model": joblib.load(MODELS_DIR / "cold_model.pkl"),
    }

# ----- SMS preprocessing -----
def sms_transform(text: str):
    A = _artifacts()
    return A["sms_vec"].transform([text])  # (1, 10000) char n-grams 2..5  :contentReference[oaicite:7]{index=7}

# ----- URL numeric features (match notebook order) -----
# suspicious keywords list and feature order exactly as in training
SUSPICIOUS = [
    "login", "update", "verify", "secure", "bank",
    "account", "confirm", "ebay", "paypal", "signin"
]  # :contentReference[oaicite:8]{index=8}

URL_FEAT_ORDER = [
    "url_length","domain_length","path_length","num_dots","num_digits","num_special",
    "https_present","ip_present","num_subdomains","keyword_count","entropy",
    "has_at_symbol","has_hyphen","num_query_params","is_numeric_domain"
]  # :contentReference[oaicite:9]{index=9}

def url_numeric_features(url: str) -> np.ndarray:
    url = url or ""
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    keyword_count = sum(kw in url.lower() for kw in SUSPICIOUS)
    # entropy as in notebook
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
    }  # :contentReference[oaicite:10]{index=10}
    return np.array([feats[k] for k in URL_FEAT_ORDER], dtype=float)  # keep training order :contentReference[oaicite:11]{index=11}

def url_transform(url: str):
    A = _artifacts()
    X_tfidf = A["url_vec"].transform([str(url)])  # (1, 5000) char n-grams 3..5 :contentReference[oaicite:12]{index=12}
    x_num = url_numeric_features(url).reshape(1, -1)  # (1, 15)
    X = sp.hstack([X_tfidf, sp.csr_matrix(x_num)])   # final columns = 5000 + 15 = 5015  :contentReference[oaicite:13]{index=13}
    return X

# ----- VOIP cold-start features -----
VOIP_FEATS = ["CountryCode","Length","UniqueDigits","Entropy","StartsWith140","RepeatScore"]  # :contentReference[oaicite:14]{index=14}
def voip_cold_features(number: str) -> pd.DataFrame:
    digits = ''.join(filter(str.isdigit, number or ""))
    if len(digits) < 2: digits = "00"
    length = len(digits)
    unique_digits = len(set(digits))
    # entropy like notebook
    if length == 0:
        entropy = 0.0
    else:
        probs = [(digits.count(d)/length) for d in set(digits)]
        entropy = float(-sum(p*np.log2(p) for p in probs))
    sw140 = 1 if digits.startswith("91140") or digits.startswith("140") else 0
    repeat_score = sum(digits.count(d)**2 for d in set(digits))
    cc = int(digits[:2])
    return pd.DataFrame([[cc, length, unique_digits, entropy, sw140, repeat_score]], columns=VOIP_FEATS)  # :contentReference[oaicite:15]{index=15}

# ----- prediction service -----
class MLService:
    def predict_one(self, text: str, typ: TypeLit) -> Dict[str, Any]:
        A = _artifacts()

        if typ == "SMS":
            X = sms_transform(text)
            proba = A["sms_model"].predict_proba(X)[0]
            idx = int(np.argmax(proba))
            cls = A["sms_model"].classes_[idx]
            return {"prediction": str(cls), "score": float(proba[idx]), "model": "SMS", "version": "v1"}

        if typ == "URL":
            X = url_transform(text)
            proba = A["url_model"].predict_proba(X)[0]
            idx = int(np.argmax(proba))
            cls = A["url_model"].classes_[idx]
            return {"prediction": str(cls), "score": float(proba[idx]), "model": "URL", "version": "v1"}

        if typ == "VOIP":
            X = voip_cold_features(text)
            if hasattr(A["voip_model"], "predict_proba"):
                proba = A["voip_model"].predict_proba(X)[0]
                idx = int(np.argmax(proba))
                cls = A["voip_model"].classes_[idx]
                return {"prediction": str(cls), "score": float(proba[idx]), "model": "VOIP", "version": "v1"}
            pred = A["voip_model"].predict(X)[0]
            return {"prediction": str(pred), "score": 0.5, "model": "VOIP", "version": "v1"}

        return {"prediction": "unknown", "score": 0.0, "model": str(typ), "version": "v1"}

    def predict_batch(self, items: List[dict]) -> List[dict]:
        out = []
        for it in items:
            res = self.predict_one(it["text"], it["type"])
            if "id" in it: res["id"] = it["id"]
            out.append(res)
        return out

service = MLService()
