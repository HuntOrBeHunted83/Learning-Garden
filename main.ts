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
	name: string,
	front: string,
	back: string,
	state: number,
	repetitionCount: number,
	interval: number,
	easinessFactor: number,
	reviewedAt: number,
	dueDate: number,
}


const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let cards = new Map<String, Card>();

const GARDEN_OF_MEMORY_VIEW = "GARDEN_OF_MEMORY_VIEW";
const GARDEN_OF_MEMORY_JSON = "GardenOfMemory.json"

export default class GardenOfMemoryPlugin extends Plugin {

	statusBarElement!: HTMLSpanElement;

	async onload() {
		console.log("GardenOfMemory loading...");

		await this.loadSettings();

		this.registerView(
			GARDEN_OF_MEMORY_VIEW,
			(leaf: WorkspaceLeaf) => new SquareView(leaf, this)
		);


		this.addRibbonIcon("sun-snow", "GardenOfMemory", () => {
			console.log("addRibbonIcon, you!");
			this.activateView();
		});

		this.addCommand({
			id: "checkLineForDoubleColon",
			name: "Check line for :: item",
			editorCallback: (editor) => {
				const cursor = editor.getCursor();
				const lineText = editor.getLine(cursor.line);

				if (lineText.includes("::")) {
					let cardID = this.generateId();

					let splitText = lineText.split("::");
					let front = splitText[0];
					let back = splitText[1];

					console.log("lineText splitText, Front, back", lineText, splitText, front, back);

					cards.set(front, {
						id: cardID,
						name: front,
						front: front,
						back: back,
						state: 0,
						repetitionCount: 0,
						interval: 1,
						easinessFactor: 2.5,
						reviewedAt: 0,
						dueDate: Date.now() + ONE_DAY_MS,
					});
					this.saveSettings();

					const leaves = this.app.workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);

					for (const leaf of leaves) {
						leaf.rebuildView();
					}

					// 
				} else {
					console.log("No :: found on this line");
				}
			},
		});
	}

	onunload() {
		this.statusBarElement.remove();
	}

	generateId(length: number = 8): string {
		const characters = "0123456789";
		let result = "";

		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			result += characters[randomIndex];
		}

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
			console.log(e);
		}
	}

	async loadSettings() {
		try {
			if (await this.app.vault.adapter.exists(GARDEN_OF_MEMORY_JSON)) {
				const fileContent = await this.app.vault.adapter.read(GARDEN_OF_MEMORY_JSON);
				const data = JSON.parse(fileContent);

				cards = new Map(data)
				console.log("read", data, cards)

			}
		} catch (error) {
			console.error("Could not load GARDEN_OF_MEMORY_JSON:", error);
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);

		if (leaves.length > 0) {
			leaf = leaves[0];
			console.log("HTML")
		} else {
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({
				type: GARDEN_OF_MEMORY_VIEW,
				active: true
			});
		}

		workspace.revealLeaf(leaf);
	}

	sm2(card: Card, quality: number): Card {
		if (quality < 3) {
			card.repetitionCount = 0;
			card.interval = 1;
		} else {
			if (card.repetitionCount === 0) {
				card.interval = 1;
			} else if (card.repetitionCount === 1) {
				card.interval = 6;
				card.state = 1;
			} else {
				card.interval = Math.round(card.interval * card.easinessFactor);
			}
			card.repetitionCount += 1;
		}

		card.easinessFactor =
			card.easinessFactor +
			(0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));


		if (card.easinessFactor < 1.3) {
			card.easinessFactor = 1.3;
		}

		if (card.easinessFactor > 3.5) {
			card.state = 3;
		}

		card.reviewedAt = Date.now();
		card.dueDate = card.reviewedAt + card.interval * ONE_DAY_MS;
		if (card.dueDate <= Date.now()) {
			card.state = 4;
		}
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
		console.log("HTML")
		const container = this.contentEl;
		container.empty();

		const stateCards = new Map<number, String[]>();
		let dueToday = 0

		for (const cardName of cards.keys()) {
			const card: Card = cards.get(cardName);

			const cardsInState = stateCards.get(card.state) ?? [];
			cardsInState.push(card.name);
			stateCards.set(card.state, cardsInState);
			if (Math.abs(Date.now() - card.dueDate) < ONE_DAY_MS) {
				dueToday = dueToday + 1
			}
		}
		console.log("stateCards", stateCards)

		container.createEl("h1", { text: "Garden Of Memory" });

		const header = ["Seed 🌱", "Pulp 🌿", "Flower 🌹", "Wilt 🥀"]
		const color = [
			"#67C7FF", // sky blue
			"#FFB86B", // warm orange
			"#FF6F91", // coral pink
			"#A78BFA", // soft violet
		];

		const colors = [
			"#1E5F9E", // deep blue — pairs with sky blue
			"#B85C16", // burnt orange — pairs with warm orange
			"#B52D52", // deep rose — pairs with coral pink
			"#5B3A9A", // deep indigo — pairs with soft violet
		];

		for (const state of stateCards.keys()) {
			const cardsInState = stateCards.get(state);

			const section = container.createEl("section");
			section.style.backgroundColor = color[state]
			section.style.color = "white";
			section.style.padding = "16px";
			section.style.borderRadius = "8px";
			section.style.margin = "12px";
			//section.style.height = "900px";

			const title = section.createEl("h1", { text: header[state] });
			title.style.color = "#000000ff";

			for (const id of stateCards.get(state)) {
				console.log(id, cards.get(id))
				let front = cards.get(id)?.front;
				const reviewButton = section.createEl("button", { text: front });
				reviewButton.style.backgroundColor = colors[state]
				// reviewButton.style.color = "#000000ff";

				reviewButton.style.padding = "16px";
				reviewButton.style.borderRadius = "8px";
				reviewButton.style.margin = "12px";

				reviewButton.addEventListener("click", async () => {
					console.log(`Reviewing ${id}`);

					// Run your review logic here:
					console.log("modal", cards.get(id));
					new ExampleModal(this.app, this.plugin, cards.get(id), (result) => {
						new Notice(`Hello, ${cards.get(id).back}!`);
						this.onOpen();
					}).open();
				});

				console.log("Add button");
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

		let ret = Number(stateCards.get(3)?.length) / Number(cards.size) * 100

		stats.createEl("h3", { text: "Rate of Retention : " + ret })
		stats.createEl("h3", { text: "Cards due today 	: " + dueToday })
		stats.createEl("h3", { text: "Total Cards 			: " + cards.size })
		stats.createEl("h6", { text: "	No of Seed [🌱] Cards   : " + stateCards.get(0)?.length })
		stats.createEl("h6", { text: "	No of Fern [🌿] Cards   : " + stateCards.get(1)?.length })
		stats.createEl("h6", { text: "	No of Flower [🌹] Cards : " + stateCards.get(2)?.length })
		stats.createEl("h6", { text: "	No of Wilter [🥀] Cards : " + stateCards.get(3)?.length })
	}

	async onClose() {
		// save
	}
}



class ExampleModal extends Modal {
	constructor(app: App, plugin: GardenOfMemoryPlugin, card: Card, onSubmit: (result: string) => void) {
		super(app);

		let icons = ["", "🌱", "🌿", "🌹", "🥀"];
		this.setTitle(icons[card.state]);

		new Setting(this.contentEl)
			.setName("Flash Card Front " + card.front);

		const backText = this.contentEl.createEl("p", {
			text: "Flash Card Back " + card.back,
		});

		backText.style.display = "none";

		let secondButtonsCreated = false;

		const backSetting = new Setting(this.contentEl);

		backSetting.addButton((back) =>
			back
				.setButtonText("Show Back")
				.onClick(() => {
					backText.style.display = "block";

					backSetting.settingEl.remove();

					if (!secondButtonsCreated) {
						secondButtonsCreated = true;

						new Setting(this.contentEl)
							.addButton((Poor) =>
								Poor.setButtonText("1 Poor").onClick(() => {
									console.log("1 clicked");
									plugin.sm2(card, 1)
									plugin.saveSettings();
									console.log("CARD UPDATE: ", card)
									this.close()
								})
							)
							.addButton((Fair) =>
								Fair.setButtonText("2 Fair").onClick(() => {
									console.log("2 clicked");
									plugin.sm2(card, 2)
									plugin.saveSettings();
									console.log("CARD UPDATE: ", card)
									this.close()
								})
							)
							.addButton((Average) =>
								Average.setButtonText("3 Average").onClick(() => {
									console.log("3 clicked");
									plugin.sm2(card, 3)
									plugin.saveSettings();
									console.log("CARD UPDATE: ", card)
									this.close()
								})
							)
							.addButton((Good) =>
								Good.setButtonText("4 Good").onClick(() => {
									console.log("4 clicked");
									plugin.sm2(card, 4)
									plugin.saveSettings();
									console.log("CARD UPDATE: ", card)
									this.close()
								})
							)
							.addButton((Excellent) =>
								Excellent.setButtonText("5 Excellent").onClick(() => {
									console.log("3 clicked");
									plugin.sm2(card, 5)
									plugin.saveSettings();

									const leaves = this.app.workspace.getLeavesOfType(GARDEN_OF_MEMORY_VIEW);

									for (const leaf of leaves) {
										leaf.rebuildView();
									}
									console.log("CARD UPDATE: ", card)
									this.close()
								})
							);
					}
				})
		);
	}
}

