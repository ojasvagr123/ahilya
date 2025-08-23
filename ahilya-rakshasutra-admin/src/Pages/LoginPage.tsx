import { useState } from "react";
import { login } from "../api";

export default function LoginPage({ onAuthed }: { onAuthed: () => void }) {
  const [phone, setPhone] = useState("+910000000000");
  const [password, setPassword] = useState("pass");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(phone, password);
      onAuthed();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff4e9]">
      {/* Header */}
      <div className="bg-[#e07b3a] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Side */}
            <div className="flex items-center space-x-6">
              {/* IMC Logo */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-white overflow-hidden">
                <img
                  src="/images/ahilya-logo.png"
                  alt="Ahilya Logo"
                  className="object-contain w-full h-full"
                />
              </div>
              {/* System Info */}
              <div className="text-white">
                <h1 className="text-2xl font-bold">अहिल्या रक्षासूत्र</h1>
                <p className="text-sm">
                  Ahilya RakshaSutra - Indore Fraud Detection System
                </p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow border border-[#f2c197] bg-[#fff9f3] overflow-hidden">
                <img
                  src="/images/imc-logo.png"
                  alt="IMC Logo"
                  className="object-contain w-full h-full"
                />
              </div>
              <div className="text-white text-right">
                <p className="text-sm font-medium">Indore Municipal Corporation</p>
                <p className="text-xs">इंदौर नगर निगम</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          {/* System Info Card */}
          <div className="bg-[#fffdfb] rounded-t-2xl p-6 border-b-4 border-[#e07b3a] shadow">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#e07b3a] rounded-full flex items-center justify-center mx-auto mb-4 shadow border-4 border-[#f2c197]">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#4a2e05] mb-2">Admin Login</h2>
              <p className="text-[#5c3d0c] text-sm font-medium">
                Secure access to fraud detection dashboard
              </p>
              <div className="mt-4 p-4 bg-[#fff7f2] border-l-4 border-[#e07b3a] rounded shadow-inner">
                <p className="text-[#4a2e05] text-xs font-medium leading-relaxed">
                  Protecting citizens of Indore from digital fraud through advanced ML detection
                </p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form
            onSubmit={submit}
            className="bg-[#fffdfb] rounded-b-2xl p-6 shadow border-t border-[#f2c197]"
          >
            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-[#4a2e05] mb-2">
                Mobile Number / मोबाइल नंबर
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-[#e07b3a]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 border border-[#f2c197] rounded-xl focus:border-[#e07b3a] focus:ring-2 focus:ring-[#f2c197] focus:outline-none transition-all duration-200 bg-[#fffaf6]"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#4a2e05] mb-2">
                Password / पासवर्ड
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-[#e07b3a]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-[#f2c197] rounded-xl focus:border-[#e07b3a] focus:ring-2 focus:ring-[#f2c197] focus:outline-none transition-all duration-200 bg-[#fffaf6]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Error Message */}
            {err && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                <span className="text-red-700 text-sm font-medium">{err}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              className="w-full bg-[#e07b3a] hover:bg-[#cf6928] text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow"
              disabled={busy}
            >
              {busy ? "Signing in... / साइन इन हो रहा है..." : "Secure Login / सुरक्षित लॉगिन"}
            </button>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-[#f4f8ff] border-l-4 border-[#4f77c9] rounded shadow-inner">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-[#4f77c9] mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-[#2f4f90] text-xs">
                  <p className="font-medium mb-1">Security Notice / सुरक्षा सूचना:</p>
                  <p>
                    This is a government system. Unauthorized access is prohibited and may result
                    in legal action.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
