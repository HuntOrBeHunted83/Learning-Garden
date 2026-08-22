import {
	TFile,
	Modal,
	ItemView,
	setIcon,
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
	MarkdownView,
	Notice
} from "obsidian";

interface Card {
	id: string,
	front: string,
	back: string,
	state: number,
	repetitionCount: number,
	interval: number,
	easinessFactor: number,
	reviewedAt: number,
	dueDate: number,
	locked?: boolean, // if true, grading never changes this card's category/state
}


const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cards = new Map<string, Card>();

const GARDEN_OF_MEMORY_VIEW = "GARDEN_OF_MEMORY_VIEW";
const GARDEN_OF_MEMORY_JSON = "GardenOfMemory.json"

const CARD_STATES = ["Seed 🌱", "Pulp 🌿", "Flower 🌹", "Wilt 🥀"]
const CARD_COLOR = [
	"#67C7FF",
	"#FFB86B",
	"#FF6F91",
	"#A78BFA",
];

const CARD_COLOR2 = [
	"#1E5F9E",
	"#B85C16",
	"#B52D52",
	"#5B3A9A",
];

export default class GardenOfMemoryPlugin extends Plugin {

	statusBarElement!: HTMLSpanElement;


	async onload() {
		console.log("GardenOfMemory loading...");

		await this.loadSettings();

		this.statusBarElement = this.addStatusBarItem();

		this.registerView(
			GARDEN_OF_MEMORY_VIEW,
			(leaf: WorkspaceLeaf) => new SquareView(leaf, this)
		);


		this.addRibbonIcon("sun-snow", "GardenOfMemory", () => {
			this.activateView();
		});

		this.addCommand({
			id: "checkLineForDoubleColon",
			name: "Check line for :: item",
			editorCallback: async (editor) => {
				const cursor = editor.getCursor();
				const lineText = editor.getLine(cursor.line);

				if (lineText.includes("::")) {
					const cardID = this.generateId();

					const splitText = lineText.split("::");

					const front = splitText[0].trim();
					const back = splitText.slice(1).join("::").trim();

					if (!front || !back) {
						new Notice("GardenOfMemory: front or back is empty, skipping.");
						return;
					}

					cards.set(cardID, {
						id: cardID,
						front: front,
						back: back,
						state: 0,
						repetitionCount: 0,
						interval: 1,
						easinessFactor: 2.5,
						reviewedAt: 0,
						dueDate: Date.now() + ONE_DAY_MS,
					});

					await this.saveSettings();
					new Notice(`Card added: "${front}"`);

					const leaves = this.app.workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);
					if (leaves.length === 0) {
						new Notice("Open the Garden of Memory view to see new cards.");
					}
					for (const leaf of leaves) {
						(leaf.view as SquareView).onOpen();
					}
				} else {
					new Notice("No :: found on this line");
				}
			},
		});
	}

	onunload() {
		console.log("GardenOfMemory unloading...");
		this.statusBarElement.remove();
	}

	generateId(length: number = 8): string {
		const characters = "0123456789";
		let result: string;

		do {
			result = "";
			for (let i = 0; i < length; i++) {
				const randomIndex = Math.floor(Math.random() * characters.length);
				result += characters[randomIndex];
			}
		} while (cards.has(result)); // avoid silent overwrites from ID collisions

		return result;
	}

	async saveSettings() {
		try {
			await this.app.vault.adapter.write(
				GARDEN_OF_MEMORY_JSON,
				JSON.stringify([...cards], null, 2)
			);
			console.log("Write done", this.app.vault.adapter.getName());
		} catch (e) {
			console.error("GardenOfMemory: failed to save data", e);
			new Notice("GardenOfMemory: failed to save data — check console.");
		}
	}

	async saveSampleData() {
		const sampleData = new Map<string, Card>();

		sampleData.set("1", {
			id: "1",
			front: "ExampleSeededData",
			back: "Seed",
			state: 0,
			repetitionCount: 0,
			interval: 1,
			easinessFactor: 2.5,
			reviewedAt: 0,
			dueDate: Date.now(),
			locked: true,
		});

		sampleData.set("2", {
			id: "2",
			front: "ExampleSproutedData",
			back: "Sprouted",
			state: 1,
			repetitionCount: 1,
			interval: 1,
			easinessFactor: 2.5,
			reviewedAt: Date.now(),
			dueDate: Date.now() + ONE_DAY_MS,
			locked: true,
		});

		sampleData.set("3", {
			id: "3",
			front: "ExampleFlowerData",
			back: "Flower",
			state: 2,
			repetitionCount: 3,
			interval: 6,
			easinessFactor: 2.5,
			reviewedAt: Date.now(),
			dueDate: Date.now() + 6 * ONE_DAY_MS,
			locked: true,
		});

		sampleData.set("4", {
			id: "4",
			front: "ExampleWiltedData",
			back: "Wilted",
			state: 3,
			repetitionCount: 0,
			interval: 1,
			easinessFactor: 1.3,
			reviewedAt: Date.now(),
			dueDate: Date.now(),
			locked: true,
		});

		// Populate in-memory state directly — don't rely on a disk round-trip
		cards = sampleData;

		try {
			await this.app.vault.adapter.write(
				GARDEN_OF_MEMORY_JSON,
				JSON.stringify([...cards], null, 2)
			);
			console.log("Sample data written", this.app.vault.adapter.getName());
		} catch (e) {
			console.error("Failed to write sample data:", e);
			new Notice("GardenOfMemory: failed to write sample data — check console.");
		}
	}

	async loadSettings() {
		try {
			// Try to read the file directly. If it doesn't exist yet (first run),
			// this throws — that's expected and handled below by seeding sample
			// data, not shown to the user as an error.
			const fileContent = await this.app.vault.adapter.read(GARDEN_OF_MEMORY_JSON);
			const data = JSON.parse(fileContent);
			cards = new Map(data);
			console.log("Loaded cards from disk", cards);
		} catch (error) {
			// No existing data file (or it's unreadable) — seed sample data quietly.
			console.log("No existing GardenOfMemory data found, seeding sample data.", error);
			await this.saveSampleData();
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({
				type: GARDEN_OF_MEMORY_VIEW,
				active: true
			});
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	sm2(card: Card, quality: number): Card {
		if (quality < 3) {
			card.repetitionCount = 0;
			card.interval = 1;
			if (!card.locked) card.state = 3;
		} else {
			if (card.repetitionCount === 0) {
				card.interval = 1;
				if (!card.locked) card.state = 1;
			} else if (card.repetitionCount === 1) {
				card.interval = 6;
				if (!card.locked) card.state = 2;
			} else {
				card.interval = Math.round(card.interval * card.easinessFactor);
				if (!card.locked) card.state = 2;
			}
			card.repetitionCount += 1;
		}

		card.easinessFactor =
			card.easinessFactor +
			(0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));


		if (card.easinessFactor < 1.3) {
			card.easinessFactor = 1.3;
		}

		card.reviewedAt = Date.now();
		card.dueDate = card.reviewedAt + card.interval * ONE_DAY_MS;

		return card;
	}
}

export class SquareView extends ItemView {
	plugin: GardenOfMemoryPlugin;
	constructor(leaf: WorkspaceLeaf, plugin: GardenOfMemoryPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return GARDEN_OF_MEMORY_VIEW;
	}

	getDisplayText() {
		return "Square view";
	}

	async onOpen() {
		// NOTE: intentionally does NOT reload from disk here.
		// `cards` is the live in-memory source of truth for the whole session;
		// reassigning it mid-session breaks any stale button closures.
		const container = this.contentEl;
		container.empty();

		const stateCards = new Map<number, string[]>();
		let dueToday = 0

		for (const cardId of cards.keys()) {
			const card = cards.get(cardId);
			if (!card) continue;

			const cardsInState = stateCards.get(card.state) ?? [];
			cardsInState.push(card.id);

			stateCards.set(card.state, cardsInState);

			if (card.dueDate <= Date.now()) {
				dueToday = dueToday + 1
			}
		}

		container.createEl("h1", { text: "Garden Of Memory" });
		container.createEl("h5", { text: "To add a flashcard use the `::` parameter, Ex: apple :: red color fruit" });


		for (let state = 0; state < CARD_STATES.length; state++) {
			const idsInState = stateCards.get(state) ?? [];

			const section = container.createEl("section");
			section.style.backgroundColor = CARD_COLOR[state]
			section.style.color = "white";
			section.style.padding = "16px";
			section.style.borderRadius = "8px";
			section.style.margin = "12px";

			const title = section.createEl("h1", { text: CARD_STATES[state] });
			title.style.color = "#000000ff";

			if (idsInState.length === 0) {
				section.createEl("p", { text: "No cards here yet." });
			}

			for (const id of idsInState) {
				const front = cards.get(id)?.front ?? "";
				const reviewButton = section.createEl("button", { text: front });
				reviewButton.style.backgroundColor = CARD_COLOR2[state]

				reviewButton.style.padding = "16px";
				reviewButton.style.borderRadius = "8px";
				reviewButton.style.margin = "12px";

				reviewButton.addEventListener("click", async () => {
					const cardData = cards.get(id);
					if (!cardData) {
						new Notice("Card not found.");
						return;
					}

					new CardFrontModal(this.app, this.plugin, cardData, (result) => {
						new Notice(`Graded: ${result}`);
						this.onOpen();
					}).open();
				});
			}
		}

		const stats = container.createEl("section");
		stats.style.backgroundColor = "#602af7ff";
		stats.style.color = "white";
		stats.style.padding = "16px";
		stats.style.borderRadius = "8px";
		stats.style.margin = "12px";


		const title = stats.createEl("h2", { text: "Dashboard" });
		title.style.color = "#010003ff";

		const matureCount = stateCards.get(2)?.length ?? 0;
		const totalCount = cards.size;
		const ret = totalCount > 0 ? (matureCount / totalCount) * 100 : 0;

		stats.createEl("h3", { text: "Rate of Retention : " + ret.toFixed(1) + "%" })
		stats.createEl("h3", { text: "Cards due today 	: " + dueToday })
		stats.createEl("h3", { text: "Total Cards 			: " + cards.size })
		stats.createEl("h6", { text: "	No of Seed [🌱] Cards   : " + (stateCards.get(0)?.length ?? 0) })
		stats.createEl("h6", { text: "	No of Fern [🌿] Cards   : " + (stateCards.get(1)?.length ?? 0) })
		stats.createEl("h6", { text: "	No of Flower [🌹] Cards : " + (stateCards.get(2)?.length ?? 0) })
		stats.createEl("h6", { text: "	No of Wilter [🥀] Cards : " + (stateCards.get(3)?.length ?? 0) })
	}

	async onClose() {
	}
}



class CardFrontModal extends Modal {
	constructor(app: App, plugin: GardenOfMemoryPlugin, card: Card, onSubmit: (result: string) => void) {
		super(app);


		this.setTitle(CARD_STATES[card.state] + " card - Front data");

		const container = this.contentEl;
		container.empty();

		const section = container.createEl("section");
		section.style.backgroundColor = CARD_COLOR[card.state]

		const title = section.createEl("h1", { text: card.front });
		title.style.color = "#000000ff";

		const reviewButton = section.createEl("button", { text: "Show Back" });
		reviewButton.style.backgroundColor = CARD_COLOR2[card.state]
		reviewButton.style.padding = "16px";
		reviewButton.style.borderRadius = "8px";
		reviewButton.style.margin = "12px";

		reviewButton.addEventListener("click", async () => {
			new CardBackModal(app, plugin, card, onSubmit).open();
			this.close()
		});
	}
}

class CardBackModal extends Modal {
	constructor(app: App, plugin: GardenOfMemoryPlugin, card: Card, onSubmit: (result: string) => void) {
		super(app);

		const buttons: Record<string, number> = {
			Poor: 1,
			Fair: 2,
			Average: 3,
			Good: 4,
			Excellent: 5,
		}

		this.setTitle(CARD_STATES[card.state] + " card - Back data");

		const container = this.contentEl;
		container.empty();

		const section = container.createEl("section");
		section.style.backgroundColor = CARD_COLOR[card.state]

		const title = section.createEl("h1", { text: card.back });
		title.style.color = "#000000ff";


		for (const [name, value] of Object.entries(buttons)) {

			const reviewButton = section.createEl("button", { text: name });
			reviewButton.style.backgroundColor = CARD_COLOR2[card.state]
			reviewButton.style.padding = "16px";
			reviewButton.style.borderRadius = "8px";
			reviewButton.style.margin = "12px";

			reviewButton.addEventListener("click", async () => {
				plugin.sm2(card, value)
				await plugin.saveSettings();

				const leaves = this.app.workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);
				for (const leaf of leaves) {
					(leaf.view as SquareView).onOpen();
				}

				onSubmit(name);
				this.close()
			});
		}
	}
}