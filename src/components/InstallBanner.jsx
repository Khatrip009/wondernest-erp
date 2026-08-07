// InstallBanner.jsx – fixed imports, correct context hooks, dynamic org/theme
import { useState } from "react";
import { X, Download } from "lucide-react";
import { useOrganization } from "../contexts/OrganizationContext";   // ✅ corrected import
import { useTheme } from "../contexts/ThemeContext";                 // ✅ already correct, path adjusted

export default function InstallBanner({ onInstall, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const { org } = useOrganization();        // ✅ useOrganization instead of useOrg
  const theme = useTheme();

  const orgName = org?.company_name || "Wondernest Learning Hub";
  const appName = `${orgName} App`;
  const logoUrl = org?.logo_light_url || "/icon-192x192.png";

  const bodyFont = theme?.font_body || "Montserrat";
  const primaryColor = theme?.primary_color || "#0D47A1";   // for fallback
  const primaryDark = theme?.primary_dark_color || "#0A3478";
  const primaryLight = theme?.primary_light_color || "#1565C0";

  if (!visible) return null;

  function handleInstall() {
    onInstall();
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    if (onDismiss) onDismiss();
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 shadow-md text-white"
      style={{ backgroundColor: primaryColor }}   // dynamic color
    >
      <div className="flex items-center gap-3">
        <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
        <div>
          <p className="text-sm font-semibold" style={{ fontFamily: bodyFont }}>
            {appName}
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: bodyFont, color: darkenColor(primaryColor) }}
          >
            Install for a better experience
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition"
          style={{
            backgroundColor: "#ffffff",
            color: primaryColor,
            fontFamily: bodyFont,
          }}
        >
          <Download size={16} />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded transition"
          style={{ color: "#ffffff", backgroundColor: primaryLight }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

// Helper to darken primary color for subtext (simple hex to darker)
function darkenColor(hex) {
  // Fallback if not provided
  if (!hex || hex.length < 7) return "#d1d5db";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 0.6;
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}