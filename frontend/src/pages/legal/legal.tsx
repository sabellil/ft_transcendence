import { useState } from "react";
import "./legal.scss";
import { useT } from "../../language.tsx";


type Tab = "privacy" | "terms";
interface Props { onClose: () => void; }


function LegalPage({ onClose }: Props) {
	const t = useT();
	const [activeTab, setActiveTab] = useState<Tab>("privacy");

	return (
		<div className="legal-overlay" onClick={onClose}>
			<div className="legal-modal" onClick={e => e.stopPropagation()}>
				<div className="legal-tabs">
					<button className={`legal-tab${activeTab === "privacy" ? " active" : ""}`}
						onClick={() => setActiveTab("privacy")}>{t("legal.privacyPolicy")}</button>
					<button className={`legal-tab${activeTab === "terms" ? " active" : ""}`}
						onClick={() => setActiveTab("terms")}>{t("legal.termsOfService")}</button>
					<button className="legal-close" onClick={onClose}>✕</button>
				</div>
				<div className="legal-content">
					<h2>{activeTab === "privacy" ? t("legal.privacyPolicy") : t("legal.termsOfService")}</h2>
					<p><strong>{t("legal.lastUpdated")}</strong></p>
					{activeTab === "privacy"
						? [1,2,3,4,5,6].map(i => (<div key={i}><h3>{t(`legal.privacy.section${i}Title`)}</h3><p>{t(`legal.privacy.section${i}Body`)}</p></div>))
						: [1,2,3,4,5,6,7].map(i => (<div key={i}><h3>{t(`legal.terms.section${i}Title`)}</h3><p>{t(`legal.terms.section${i}Body`)}</p></div>))
					}
				</div>
			</div>
		</div>
	);
}


export default LegalPage;
