import { ItemView, WorkspaceLeaf, MetadataCache, Vault, TFile } from 'obsidian';

export const TAG_TREE_VIEW = 'tagtree-view';
export type IconName = 'folder-tree';

export class TagTreeView extends ItemView {
  // State object to keep track of open/closed tags
  private tagState: Record<string, boolean> = {};

  // Method to search notes with selected tags
  private selectedTags: string[] = []; // Array to hold selected tags

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return TAG_TREE_VIEW;
  }

  getDisplayText() {
    return 'Tag Tree';
  }

  getIcon(): IconName {
    return 'folder-tree';
  }

  async onOpen() {
    this.addStyles(); // Add styles for the tag tree
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Tag Tree' });

    // Load the tag structure from a separate file
    const tagStructure = await this.loadTagStructure();
    this.renderTagTree(container as HTMLElement, tagStructure);

    // Add a global drop event listener to reset tags to the top level
    document.addEventListener('drop', async (event) => {
      event.preventDefault();
      const draggedTag = event.dataTransfer?.getData('text/plain');
      if (draggedTag) {
        console.log('Dropped outside, resetting to top level:', draggedTag);
        const tagStructure = await this.loadTagStructure();
        const draggedData = this.removeTag(tagStructure, draggedTag);
        tagStructure[draggedTag] = draggedData; // Reset to top level
        await this.saveTagStructure(tagStructure);
        this.renderTagTree(container as HTMLElement, tagStructure);
      }
    });

    // Prevent default behavior for dragover to allow drop
    document.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
  }

  // Method to load the tag structure from a file and merge new tags
  private async loadTagStructure(): Promise<any> {
    const fileName = 'tag-structure.json';
    const vault = this.app.vault;
    const file = vault.getAbstractFileByPath(fileName);

    let tagStructure: Record<string, any> = {};

    if (file instanceof TFile) {
      const data = await vault.read(file);
      try {
        tagStructure = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing tag structure file:', error);
      }
    } else {
      // Create the file with an empty structure if it doesn't exist
      tagStructure = {}; // Initialize with an empty structure
      await vault.create(fileName, JSON.stringify(tagStructure, null, 2));
      console.log('Created new tag structure file:', fileName);
    }

    // Merge new tags from Obsidian
    const allTags = this.getAllTags();
    this.mergeTags(tagStructure, allTags);

    // Save the updated structure back to the file
    await this.saveTagStructure(tagStructure);

    return tagStructure;
  }

  // Recursive function to merge tags
  private mergeTags(existingStructure: any, newTags: string[]) {
    // Sort newTags in alphabetical order
    newTags.sort(); // Sort the tags alphabetically

    newTags.forEach(tag => {
      if (!this.findTag(existingStructure, tag)) {
        existingStructure[tag] = {}; // Add the tag if it doesn't exist
        console.log(`Added new tag: ${tag}`);
      } else {
        console.log(`Tag already exists: ${tag}`);
      }
    });
  }

  // Helper function to find a tag in the structure
  private findTag(structure: any, tag: string): boolean {
    if (structure[tag]) {
      return true; // Tag found
    }
    // Recursively search through child tags
    for (const key in structure) {
      if (this.findTag(structure[key], tag)) {
        return true;
      }
    }
    return false; // Tag not found
  }

  // Method to save the tag structure to a file
  private async saveTagStructure(tagStructure: any): Promise<void> {
    const fileName = 'tag-structure.json'; // Define the file name
    const vault = this.app.vault;
    const file = vault.getAbstractFileByPath(fileName);

    const data = JSON.stringify(tagStructure, null, 2);

    if (file instanceof TFile) {
      await vault.modify(file, data);
    } else {
      await vault.create(fileName, data);
    }
  }

  // Method to load the tag state from local storage
  private loadTagState() {
    const storedState = localStorage.getItem('tagState');
    if (storedState) {
      this.tagState = JSON.parse(storedState);
    }
  }

  // Method to save the tag state to local storage
  private saveTagState() {
    localStorage.setItem('tagState', JSON.stringify(this.tagState));
  }

  // Method to clear the tag search
  private clearTagSearch() {
    this.selectedTags = []; // Reset the selected tags array
    const searchLeaves = this.app.workspace.getLeavesOfType('search');
    if (searchLeaves.length > 0) {
      searchLeaves[0].setViewState({
        type: 'search',
        state: { query: '' }, // Clear the search query
      });
      this.app.workspace.setActiveLeaf(searchLeaves[0]);
      console.log('Cleared search view.');
    }
  }

  // Method to render the nested tag tree
  private async renderTagTree(container: HTMLElement, tagStructure: any) {
    // Clear the container
    container.empty();
    console.log('Rendering tag tree...');

    // Load the tag state from local storage
    this.loadTagState();

    // Create a list element
    const ul = container.createEl('ul');
    ul.addClass('tag-tree'); // Add a class for styling

    // Create a toolbar container
    const toolbar = container.createEl('div');
    toolbar.addClass('tag-toolbar'); // Add a class for styling
    toolbar.style.display = 'flex'; // Use flexbox for layout
    toolbar.style.justifyContent = 'space-between'; // Space buttons evenly
    toolbar.style.width = '100%'; // Full width

    //const refreshButton = toolbar.createEl('button', { text: 'Refresh' });
    const refreshButton = toolbar.createEl('button');
    refreshButton.addClass('tag-item'); // Add a class for styling
    refreshButton.style.flex = '1'; // Take up equal space

    // Create the SVG for the refresh icon
    const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;

    // Set the inner HTML of the button to the SVG
    refreshButton.innerHTML = refreshIcon;

    // Add click event for the refresh button
    refreshButton.onclick = async () => {
      this.clearTagSearch(); // Clear the search first
      const tagStructure = await this.loadTagStructure(); // Reload tag structure
      this.renderTagTree(container as HTMLElement, tagStructure); // Re-render the tag tree
    };

    // Recursive function to render tags
    const renderTags = (tags: any, parentElement: HTMLElement, level: number = 0) => {
      Object.keys(tags).forEach(tag => {
        const li = parentElement.createEl('li');

        // Create a clickable tag element
        const tagElement = li.createEl('div', { text: tag });
        tagElement.addClass('tag-item'); // Add a class for styling
        tagElement.draggable = true;

        // Check if the tag has subtags
        const hasSubtags = Object.keys(tags[tag]).length > 0;

        // Create an arrow icon if there are subtags
        if (hasSubtags) {
          const arrow = li.createEl('span'); // Create a span for the arrow
          arrow.addClass('arrow-icon'); // Add a class for styling

          // Set the initial icon to chevron-right with responsive size
          arrow.innerHTML = '<svg class="lucide lucide-chevron-right" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

          // Create a child <ul> for subtags
          const childUl = li.createEl('ul'); // Create a new <ul> for child tags
          childUl.addClass('tag-child'); // Add a class for styling
          renderTags(tags[tag], childUl, level + 1); // Increase level for child tags
          childUl.style.display = this.tagState[tag] ? 'block' : 'none'; // Set visibility based on state

          // Append the child <ul> after the tag element
          li.appendChild(tagElement);
          li.appendChild(childUl); // Append child <ul> to the current <li>

          // Set the arrow direction based on the state
          arrow.innerHTML = this.tagState[tag]
            ? '<svg class="lucide lucide-chevron-down" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
            : '<svg class="lucide lucide-chevron-right" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

          arrow.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from triggering tag search
            const isVisible = childUl.style.display === 'block';
            childUl.style.display = isVisible ? 'none' : 'block'; // Toggle visibility

            // Change the icon based on visibility
            arrow.innerHTML = isVisible
              ? '<svg class="lucide lucide-chevron-right" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
              : '<svg class="lucide lucide-chevron-down" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; // Change to chevron-down

            // Update the state
            this.tagState[tag] = !isVisible;
            this.saveTagState(); // Save the updated state
          });

          tagElement.prepend(arrow); // Add arrow before the tag element
        } else {
          // If no subtags, just append the tag element
          li.appendChild(tagElement);
        }

        // Add click event listener to trigger a search for notes with the tag
        tagElement.addEventListener('click', () => {
          // Check if the tag is already in the selectedTags array
          const tagIndex = this.selectedTags.indexOf(tag);
          if (tagIndex > -1) {
            // If the tag is already selected, remove it from the array
            this.selectedTags.splice(tagIndex, 1);
          } else {
            // If the tag is not selected, add it to the array
            this.selectedTags.push(tag);
          }

          // Create a combined search query for all selected tags
          const searchQuery = this.selectedTags.map(t => `tag:${t}`).join(' '); // Use space instead of AND
          console.log('Searching for notes with tags:', this.selectedTags);

          const searchLeaves = this.app.workspace.getLeavesOfType('search');
          if (searchLeaves.length > 0) {
            searchLeaves[0].setViewState({
              type: 'search',
              state: { query: searchQuery },
            });
            this.app.workspace.setActiveLeaf(searchLeaves[0]);
            console.log('Updated existing search view with query:', searchQuery);
          } else {
            const newLeaf = this.app.workspace.getLeaf(true);
            newLeaf.setViewState({
              type: 'search',
              state: { query: searchQuery },
            });
            this.app.workspace.setActiveLeaf(newLeaf);
            console.log('Opened new search view with query:', searchQuery);
          }
        });

        // Add drag event listeners
        tagElement.addEventListener('dragstart', (event) => {
          console.log('dragstart:', tag);
          event.dataTransfer?.setData('text/plain', tag);
        });

        tagElement.addEventListener('dragover', (event) => {
          console.log('dragover:', tag);
          event.preventDefault(); // Allow drop
        });

        tagElement.addEventListener('drop', async (event) => {
          console.log('drop:', tag);
          event.preventDefault();
          event.stopPropagation(); // Prevent the global drop event from firing
          const draggedTag = event.dataTransfer?.getData('text/plain');
          if (draggedTag) {
            console.log('Dragging:', draggedTag, 'to:', tag);
            await this.handleTagDragAndDrop(draggedTag, tag);
          }
        });

        // Append the <li> to the parent element
        parentElement.appendChild(li); // Append the <li> to the parent element
      });
    };

    // Start rendering from the root
    renderTags(tagStructure, ul);
    container.appendChild(ul);
    console.log('Finished rendering tag tree.');
  }

  // Method to handle drag-and-drop and update the tag structure
  private async handleTagDragAndDrop(draggedTag: string, targetTag: string) {
    const tagStructure = await this.loadTagStructure();

    // Prevent invalid drops (e.g., dragging onto itself or a descendant)
    if (draggedTag === targetTag || this.isDescendant(tagStructure, draggedTag, targetTag)) {
      console.warn('Invalid drop operation');
      return;
    }

    // Find the parent tag structure for the targetTag
    const targetParent = this.findParentTag(tagStructure, targetTag);
    const draggedData = this.removeTag(tagStructure, draggedTag);

    // If targetTag doesn't exist, create it
    if (!targetParent) {
      console.warn('Target tag not found');
      return;
    }

    // Move draggedTag under targetTag
    if (!targetParent[targetTag]) {
      targetParent[targetTag] = {};
    }
    targetParent[targetTag][draggedTag] = draggedData;

    // Save the updated structure back to the file
    await this.saveTagStructure(tagStructure);

    // Re-render the tag tree with the updated structure
    const container = this.containerEl.children[1];
    this.renderTagTree(container as HTMLElement, tagStructure);
  }

  // Helper method to find the parent tag structure
  private findParentTag(tagStructure: any, targetTag: string): any {
    for (const key in tagStructure) {
      if (key === targetTag) {
        return tagStructure; // Return the current structure if it's the target
      }
      const child = this.findParentTag(tagStructure[key], targetTag);
      if (child) {
        return child; // Return the found parent structure
      }
    }
    return null; // Return null if not found
  }

  // Helper method to check if a tag is a descendant of another
  private isDescendant(tagStructure: any, draggedTag: string, targetTag: string): boolean {
    if (!tagStructure[targetTag]) return false;
    if (tagStructure[targetTag][draggedTag]) return true;
    return Object.keys(tagStructure[targetTag]).some(subTag =>
      this.isDescendant(tagStructure[targetTag], draggedTag, subTag)
    );
  }

  // Helper method to remove a tag from the structure
  private removeTag(tagStructure: any, tag: string): any {
    for (const key in tagStructure) {
      if (key === tag) {
        const data = tagStructure[key];
        delete tagStructure[key];
        return data;
      }
      if (tagStructure[key]) {
        const result = this.removeTag(tagStructure[key], tag);
        if (result) return result;
      }
    }
    return null;
  }

  // Method to get all tags from Obsidian
  private getAllTags(): string[] {
    const tagsSet = new Set<string>();
    const metadataCache = this.app.metadataCache;
    const vault = this.app.vault;

    // Iterate over all files in the vault
    vault.getMarkdownFiles().forEach(file => {
      const fileCache = metadataCache.getFileCache(file);
      if (fileCache) {
        // Add each tag from the frontmatter to the set
        if (fileCache.frontmatter && fileCache.frontmatter.tags) {
          fileCache.frontmatter.tags.forEach((tag: string) => tagsSet.add(tag));
        }
        // Add each tag from the body to the set
        if (fileCache.tags) {
          fileCache.tags.forEach(tag => tagsSet.add(tag.tag));
        }
        // Check for invalid frontmatter keys and add them as tags
        Object.keys(fileCache.frontmatter || {}).forEach(key => {
          if (!tagsSet.has(key) && key !== 'tags') { // Exclude recognized tags
            tagsSet.add(key); // Add invalid frontmatter key as a tag
          }
        });
      }
    });

    // Convert the set to an array and return
    return Array.from(tagsSet);
  }

  // CSS for styling the tag tree
  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tag-tree {
        list-style-type: none; /* Remove bullet points */
        padding: 0; /* Remove default padding */
        margin: 0; /* Remove default margin */
      }
      .tag-item {
        padding: 2px 0; /* Reduce vertical padding for tighter appearance */
        list-style-type: none; /* Remove bullet points */
        margin: 0; /* Remove vertical margin */
        background-color: transparent; /* Make background transparent by default */
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        width: calc(100% - 16px); /* Adjust width to account for padding */
      }
      .tag-child {
        list-style-type: none; /* Remove bullet points */
        padding-left: 30px; /* Add padding for indentation */
      }
      .tag-item:hover {
        background-color: #f0f0f05c; /* Change background on hover */
      }
      .arrow-icon {
        display: inline-flex; /* Ensure the arrow is inline */
        align-items: center; /* Center the icon vertically */
        margin-right: 5px; /* Space between arrow and tag name */
        cursor: pointer; /* Change cursor to pointer */
        font-size: inherit; /* Make the icon size inherit from the text */
      }
    `;
    document.head.appendChild(style);
  }

  async onClose() {
    // Nothing to clean up.
  }
}