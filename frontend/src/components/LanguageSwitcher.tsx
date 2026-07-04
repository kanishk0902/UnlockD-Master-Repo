import React, { useState, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES, LanguageCode } from "../context/LanguageContext";

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#1a1d24",
          color: "#e5e7eb",
          border: "1px solid #2d323c",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3f4451")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2d323c")}
      >
        <span>{current.nativeLabel}</span>
        <span style={{ fontSize: "10px", opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#15171c",
            border: "1px solid #2d323c",
            borderRadius: "10px",
            padding: "4px",
            minWidth: "160px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 50,
          }}
        >
          {LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: lang.code === language ? "#60a5fa" : "#d1d5db",
                background: lang.code === language ? "#1e2530" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1e2530")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = lang.code === language ? "#1e2530" : "transparent")
              }
            >
              <span>{lang.nativeLabel}</span>
              <span style={{ fontSize: "11px", opacity: 0.5 }}>{lang.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;