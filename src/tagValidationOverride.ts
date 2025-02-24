import { App } from 'obsidian';

export function overrideTagValidation(app: App, allowSpecialCharacters: boolean, enableQuoteWrapping: boolean) {
    if (!allowSpecialCharacters) return;

    // Wrap tags in quotes if the setting is enabled
    if (enableQuoteWrapping) {
        const originalSaveNote = app.vault.modify;

        app.vault.modify = async function (file, content) {
            // Wrap any tags in quotes
            content = content.replace(/#([^\s]+)/g, (match) => {
                return `"${match}"`; // Wrap tags in quotes
            });

            return originalSaveNote.call(this, file, content);
        };
    }

    // Existing tag validation logic can go here
    // ...

    // Wait for the DOM to fully load
    document.addEventListener('DOMContentLoaded', () => {
        const inputField = document.querySelector('.multi-select-input');

        if (inputField) {
            console.log('Input field found:', inputField); // Confirm the element is found
            inputField.addEventListener('keydown', (event) => {
                console.log('Keydown event triggered');
                const target = event.target as HTMLElement;

                if (target) {
                    const tag = target.innerText.trim(); // Get the current input value
                    console.log('Current input value:', tag); // Log the input value

                    // Only call updateSourceMode if the setting is enabled
                    if (allowSpecialCharacters) {
                        // Modify the tag as needed (e.g., wrap in quotes)
                        const modifiedTag = `"${tag}"`;
                        console.log('Modified tag:', modifiedTag); // Log the modified tag

                        // Update the source mode content
                        updateSourceMode(app, modifiedTag);
                    }

                    // Optionally clear the input field
                    target.innerText = ''; // Clear the input field
                } else {
                    console.error('Event target is null');
                }
            });
        } else {
            console.error('Input field not found'); // Log if the element is not found
        }
    });
}

function updateSourceMode(app: App, tag: string) {
    const activeFile = app.workspace.getActiveFile(); // Get the currently active file

    if (activeFile) {
        // Read the current content of the file
        app.vault.read(activeFile).then((content) => {
            console.log('Current file content:', content); // Log the current content

            // Use a regex to find the frontmatter section
            const frontmatterRegex = /---\n([\s\S]*?)---/;
            const match = content.match(frontmatterRegex);

            if (match) {
                // Extract the frontmatter content
                const frontmatter = match[1];

                // Split the existing tags into an array
                const tagsRegex = /tags:\s*\n((?:\s*-\s*.*\n)*)/;
                const tagsMatch = frontmatter.match(tagsRegex);

                let newTags = [];
                if (tagsMatch) {
                    // Get existing tags and add the new tag
                    const existingTags = tagsMatch[1].split('\n').filter(tag => tag.trim() !== '');
                    newTags = existingTags.map(tag => tag.trim()).concat(`  - "${tag}"`); // Wrap only in properties
                } else {
                    // If no tags section exists, create one
                    newTags.push(`  - "${tag}"`); // Wrap only in properties
                }

                // Construct the new frontmatter
                const newFrontmatter = `---\n${frontmatter.replace(tagsRegex, `tags:\n${newTags.join('\n')}\n`)}---`;

                // Log the new frontmatter
                console.log('New frontmatter:', newFrontmatter);

                // Update the file with the new content
                const newContent = content.replace(frontmatter, newFrontmatter);
                app.vault.modify(activeFile, newContent).then(() => {
                    console.log('File updated successfully');
                }).catch((error) => {
                    console.error('Error updating the file:', error);
                });
            } else {
                console.error('No frontmatter found in the active file.');
            }
        }).catch((error) => {
            console.error('Error reading the file:', error);
        });
    } else {
        console.error('No active file found.');
    }
} 