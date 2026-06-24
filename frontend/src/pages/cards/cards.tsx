import { useState } from "react";
import "./cards.scss";
import type { Card } from "../../constants.ts";
import { assetUrl } from "../../engine/api.ts";
import { getCardList } from "../../engine/cards.ts";
import { useAbortableLoad } from "../../app.tsx";


function CardsList() {
	const [cards, setCards] = useState<Card[]>([]);

	const load = async (signal?: AbortSignal) => {
		const data = await getCardList();
		if (signal?.aborted) return;
		if (data) setCards(data);
	};
	useAbortableLoad(load, []);

	return (
		<div className="cards-grid">
			{cards.map(card => (
				<div key={card.name} className="card-tile">
					<img className="card-img" src={assetUrl(card.image)} alt={card.name} />
					<span className="card-label">{card.name}</span>
				</div>
			))}
		</div>
	);
}


export default CardsList;
