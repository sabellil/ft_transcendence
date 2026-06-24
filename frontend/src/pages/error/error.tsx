import "./error.scss";
import { useT } from "../../language.tsx";


interface Props { onRetry: () => void; }


function ErrorPage({ onRetry }: Props) {
	const t = useT();
	return (
		<div className="error-page">
			<h1>⚠️</h1>
			<h2>{t("error.title")}</h2>
			<button onClick={onRetry}>{t("error.retry")}</button>
		</div>
	);
}


export default ErrorPage;
