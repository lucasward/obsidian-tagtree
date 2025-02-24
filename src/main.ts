import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, addIcon, ItemView, WorkspaceLeaf } from 'obsidian';
import { TagTreeView, TAG_TREE_VIEW } from 'tagtreeview';
//import { overrideTagValidation } from './tagValidation';
// Remember to rename these classes and interfaces!

interface TagTreeSettings {
	mySetting: string;
	allowSpecialCharacters: boolean;
}

const DEFAULT_SETTINGS: TagTreeSettings = {
	mySetting: 'default',
	allowSpecialCharacters: false
}

export default class TagTreePlugin extends Plugin {
	settings: TagTreeSettings;
	public allowSpecialCharacters: boolean = false; // Default value

	async onload() {
		this.registerView(
			TAG_TREE_VIEW,
			(leaf) => new TagTreeView(leaf)
		);

		this.addRibbonIcon('tree-pine', 'Activate view', () => {
			this.activateView();
		});
		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//const statusBarItemEl = this.addStatusBarItem();
		//statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TagTreeSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(TAG_TREE_VIEW);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: TAG_TREE_VIEW, active: true });
			} else {
				console.error('Failed to get a right leaf.');
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		} else {
			console.error('Leaf is null, cannot reveal.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		console.log('Loaded settings:', this.settings); // Log loaded settings
		this.allowSpecialCharacters = this.settings.allowSpecialCharacters; // Load saved setting
	}

	async saveSettings() {
		console.log('Saving settings:', this.settings); // Log settings to be saved
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TagTreeSettingTab extends PluginSettingTab {
	plugin: TagTreePlugin;

	constructor(app: App, plugin: TagTreePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Tag Tree Settings' });

		// new Setting(containerEl)
		// 	.setName('Setting #1')
		// 	.setDesc('It\'s a secret')
		// 	.addText(text => text
		// 		.setPlaceholder('Enter your secret')
		// 		.setValue(this.plugin.settings.mySetting)
		// 		.onChange(async (value) => {
		// 			this.plugin.settings.mySetting = value;
		// 			await this.plugin.saveSettings();
		// 		}));

		// Toggle for allowing special characters in tags
		new Setting(containerEl)
			.setName('Allow Special Characters in Tags')
			.setDesc('Enable this to allow tags with special characters.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.allowSpecialCharacters)
					.onChange(async (value) => {
						this.plugin.allowSpecialCharacters = value;
						this.plugin.settings.allowSpecialCharacters = value; // Update the settings object
						await this.plugin.saveSettings(); // Save the setting
					})
			);
	}
}
