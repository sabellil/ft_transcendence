import { API_CARD, apiGet, apiPost, uploadMultipart, authOpts } from "./api.ts";


import type { Card, Ok } from "../constants.ts";










// getCardList — fetch all cards paginated
export function getCardList() {
	return apiGet<Card[]>(API_CARD);
}





// getCard — fetch single card by name
export function getCard(cardName: string) {
	return apiGet<Card>(`${API_CARD}/${(cardName)}`);
}





// createCard — admin: create new card
export async function createCard(body: {
	name: string; pokemon: string; rarity?: string; type?: string; subType?: string; health?: number;
}): Promise<Ok> {
	const res = await fetch(API_CARD, authOpts({ json: body }));
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "error.createCardFailed");
	return data as Ok;
}





// editCard — admin: update card with optional image upload
export async function editCard(cardName: string, body: {
	name?: string; pokemon?: string; rarity?: string; type?: string; subType?: string; health?: number; cardFile?: File;
}) {
	const url = `${API_CARD}/${(cardName)}`;
	const extraFields: Record<string, string> = {};
	if (body.name)    extraFields.name    = body.name;
	if (body.pokemon) extraFields.pokemon = body.pokemon;
	if (body.rarity)  extraFields.rarity  = body.rarity;
	if (body.type)    extraFields.type    = body.type;
	if (body.subType) extraFields.subType = body.subType;
	if (body.health !== undefined) extraFields.health = String(body.health);

	const res = body.cardFile
		// uploadMultipart — upload card image with extra fields
		? await uploadMultipart(url, body.cardFile, extraFields)
		: await fetch(url, authOpts({ json: body }));

	const data = await res.json();
	// !res.ok → API error, throw
	if (!res.ok) throw new Error(data.error || "error.editCardFailed");
	return data as Card;
}





// deleteCard — admin: remove card
export function deleteCard(cardName: string) {
	// apiPost — POST delete card
	return apiPost<Ok>(`${API_CARD}/${(cardName)}/remove`);
}
