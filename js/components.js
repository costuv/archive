/**
 * UI Components Module
 * Renders all UI elements using vanilla JavaScript
 */

// ============================================
// FILE CARD
// ============================================

/**
 * Render a file card
 * @param {Object} file - File data
 * @param {boolean} showActions - Whether to show edit/delete actions (admin only)
 * @returns {string} HTML string
 */
function renderFileCard(file, showActions = false) {
  const typeIcon = getFileTypeIcon(file.type);
  const dateStr = formatDate(file.createdAt);
  
  // Build tags HTML
  const tagsHtml = (file.tags || []).map(tag => `
    <span class="tag">
      ${getIcon('tag')}
      ${escapeHtml(tag)}
    </span>
  `).join('');

  // Thumbnail removed - cards only show text now
  let thumbnailHtml = '';

  // Build actions HTML (only if admin)
  const actionsHtml = showActions ? `
    <div class="file-card-actions">
      <button class="action-btn edit-btn" data-id="${file.id}" title="Edit">
        ${getIcon('edit')}
      </button>
      ${file.fileUrl ? `
        <button class="action-btn download-btn" data-url="${escapeHtml(file.fileUrl)}" data-filename="${escapeHtml(file.fileName || file.title)}" title="Download">
          ${getIcon('download')}
        </button>
      ` : ''}
      <button class="action-btn delete delete-btn" data-id="${file.id}" title="Delete">
        ${getIcon('trash')}
      </button>
    </div>
  ` : (file.fileUrl ? `
    <div class="file-card-actions" style="opacity: 1;">
      <button class="action-btn download-btn" data-url="${escapeHtml(file.fileUrl)}" data-filename="${escapeHtml(file.fileName || file.title)}" title="Download">
        ${getIcon('download')}
      </button>
    </div>
  ` : '');

  // Build folder info HTML
  const folderHtml = file.folderName ? `
    <div class="file-card-folder">
      ${getIcon('folder')}
      ${escapeHtml(file.folderName)}
    </div>
  ` : '';

  return `
    <div class="file-card" data-id="${file.id}">
      <div class="file-card-header">
        <div class="file-card-header-content">
          <div class="file-card-info">
            <div class="file-type-icon">
              <span class="icon">${typeIcon}</span>
            </div>
            <div class="file-card-meta">
              <h3 class="file-card-title" title="${escapeHtml(file.title)}">${escapeHtml(file.title)}</h3>
              <div class="file-card-details">
                <span class="file-card-type">${file.type}</span>
                ${file.fileSize ? `<span>• ${file.fileSize}</span>` : ''}
              </div>
            </div>
          </div>
          ${actionsHtml}
        </div>
      </div>
      <div class="file-card-body">
        ${thumbnailHtml}
        ${file.description ? `
          <p class="file-card-description">${escapeHtml(file.description)}</p>
        ` : ''}
        ${tagsHtml ? `<div class="file-card-tags">${tagsHtml}</div>` : ''}
        <div class="file-card-footer">
          <div class="file-card-date">
            ${getIcon('calendar')}
            ${dateStr}
          </div>
          ${folderHtml}
        </div>
      </div>
    </div>
  `;
}

// ============================================
// FILES GRID
// ============================================

/**
 * Render the files grid or empty state
 * @param {Array} files - Array of file objects
 * @param {boolean} isAdmin - Whether current user is admin
 */
function renderFilesGrid(files, isAdmin = false) {
  const container = document.getElementById('files-container');
  if (!container) return;

  if (files.length === 0) {
    container.innerHTML = renderEmptyState(isAdmin);
  } else {
    const cardsHtml = files.map(file => renderFileCard(file, isAdmin)).join('');
    container.innerHTML = `<div class="files-grid">${cardsHtml}</div>`;
  }

  // Attach event listeners to cards
  attachCardEventListeners();
}

/**
 * Render empty state
 * @param {boolean} isAdmin 
 * @returns {string} HTML string
 */
function renderEmptyState(isAdmin = false) {
  return `
    <div class="empty-state">
      <div class="empty-icon">
        <div class="empty-icon-text">∅</div>
      </div>
      <h2 class="empty-title">Archive is empty</h2>
      <p class="empty-description">
        Begin building your academic archive by adding documents, PDFs, images, and notices
      </p>
      ${isAdmin ? `
        <button class="btn btn-primary" id="empty-add-btn">
          ${getIcon('plus')}
          Add First Entry
        </button>
      ` : ''}
    </div>
  `;
}

// ============================================
// SIDEBAR RENDERING
// ============================================

/**
 * Render folder buttons in sidebar
 * @param {Array} folders 
 * @param {string} selectedFolderId 
 */
function renderFolderFilters(folders, selectedFolderId = null) {
  const container = document.getElementById('folder-filters');
  if (!container) return;

  if (folders.length === 0) {
    container.innerHTML = `
      <div class="sidebar-empty-text" style="padding: 0.5rem; font-size: 0.75rem; color: var(--color-gray-500); font-family: var(--font-mono);">
        No collections yet
      </div>
    `;
    return;
  }

  const buttonsHtml = folders.map(folder => `
    <button class="sidebar-btn${selectedFolderId === folder.id ? ' active' : ''}" 
            data-folder-id="${folder.id}">
      ${getIcon('folder-open')}
      <span class="btn-text">${escapeHtml(folder.name)}</span>
      <span class="btn-count">${folder.count}</span>
    </button>
  `).join('');

  container.innerHTML = buttonsHtml;
}

/**
 * Render tag buttons in sidebar
 * @param {Array} tags - Array of tag strings
 * @param {Array} selectedTags - Currently selected tags
 */
function renderTagFilters(tags, selectedTags = []) {
  const section = document.getElementById('tags-section');
  const container = document.getElementById('tag-filters');
  
  if (!section || !container) return;

  if (tags.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const buttonsHtml = tags.map(tag => `
    <button class="sidebar-btn tag-btn${selectedTags.includes(tag) ? ' active' : ''}" 
            data-tag="${escapeHtml(tag)}">
      ${getIcon('tag')}
      <span class="btn-text">${escapeHtml(tag)}</span>
    </button>
  `).join('');

  container.innerHTML = buttonsHtml;
}

/**
 * Extract all unique tags from files
 * @param {Array} files 
 * @returns {Array} Sorted array of unique tags
 */
function extractAllTags(files) {
  const tagSet = new Set();
  files.forEach(file => {
    (file.tags || []).forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// ============================================
// FILE DIALOG
// ============================================

/**
 * Open file dialog for creating/editing
 * @param {Object|null} file - Existing file data for editing, null for new entry
 * @param {Array} folders - Available folders
 */
function openFileDialog(file = null, folders = []) {
  const dialog = document.getElementById('file-dialog');
  const title = document.getElementById('file-dialog-title');
  const submitBtn = document.getElementById('file-dialog-submit');
  const form = document.getElementById('file-form');
  const folderSelect = document.getElementById('entry-folder');

  // Reset form
  form.reset();
  clearFileTags();
  resetFileUpload();

  // Update folder options
  folderSelect.innerHTML = '<option value="">Uncategorized</option>' + 
    folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');

  if (file) {
    // Editing existing file
    title.textContent = 'Edit Archive Entry';
    submitBtn.textContent = 'Save Changes';
    
    document.getElementById('file-id').value = file.id;
    document.getElementById('entry-title').value = file.title || '';
    document.getElementById('entry-type').value = file.type || 'document';
    document.getElementById('entry-folder').value = file.folderId || '';
    document.getElementById('entry-description').value = file.description || '';
    
    // Set tags
    (file.tags || []).forEach(tag => addTagToList(tag));

    // Show existing file info
    if (file.fileName) {
      showFilePreview(file.fileName);
    }
  } else {
    // New file
    title.textContent = 'New Archive Entry';
    submitBtn.textContent = 'Add to Archive';
    document.getElementById('file-id').value = '';
  }

  dialog.showModal();
}

/**
 * Close file dialog
 */
function closeFileDialog() {
  const dialog = document.getElementById('file-dialog');
  dialog.close();
}

// ============================================
// FILE UPLOAD HANDLING
// ============================================

let selectedFile = null;

/**
 * Show file preview in upload area
 * @param {string} fileName 
 */
function showFilePreview(fileName) {
  const uploadContent = document.getElementById('upload-content');
  const uploadPreview = document.getElementById('upload-preview');
  const fileNameSpan = document.getElementById('selected-file-name');

  uploadContent.style.display = 'none';
  uploadPreview.style.display = 'flex';
  fileNameSpan.textContent = fileName;
}

/**
 * Reset file upload area
 */
function resetFileUpload() {
  const uploadContent = document.getElementById('upload-content');
  const uploadPreview = document.getElementById('upload-preview');
  const fileInput = document.getElementById('file-input');

  uploadContent.style.display = 'block';
  uploadPreview.style.display = 'none';
  fileInput.value = '';
  selectedFile = null;
}

/**
 * Handle file selection
 * @param {File} file 
 */
function handleFileSelect(file) {
  if (!file) return;
  
  selectedFile = file;
  showFilePreview(file.name);

  // Auto-detect type based on file extension
  const ext = file.name.split('.').pop().toLowerCase();
  const typeSelect = document.getElementById('entry-type');
  
  if (['pdf'].includes(ext)) {
    typeSelect.value = 'pdf';
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    typeSelect.value = 'image';
  } else if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext)) {
    typeSelect.value = 'audio';
  } else if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    typeSelect.value = 'document';
  }
}

// ============================================
// TAGS HANDLING
// ============================================

let currentTags = [];

/**
 * Add a tag to the list
 * @param {string} tag 
 */
function addTagToList(tag) {
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed || currentTags.includes(trimmed)) return;
  
  currentTags.push(trimmed);
  renderTagsList();
}

/**
 * Remove a tag from the list
 * @param {string} tag 
 */
function removeTagFromList(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  renderTagsList();
}

/**
 * Clear all tags
 */
function clearFileTags() {
  currentTags = [];
  renderTagsList();
}

/**
 * Render the tags list in the dialog
 */
function renderTagsList() {
  const container = document.getElementById('tags-list');
  if (!container) return;

  container.innerHTML = currentTags.map(tag => `
    <span class="tag-item">
      ${escapeHtml(tag)}
      <button type="button" class="tag-remove" data-tag="${escapeHtml(tag)}">
        ${getIcon('x')}
      </button>
    </span>
  `).join('');

  // Attach remove listeners
  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeTagFromList(btn.dataset.tag);
    });
  });
}

/**
 * Get current tags
 * @returns {Array}
 */
function getCurrentTags() {
  return [...currentTags];
}

// ============================================
// FOLDER DIALOG
// ============================================

/**
 * Open folder dialog
 */
function openFolderDialog() {
  const dialog = document.getElementById('folder-dialog');
  document.getElementById('folder-name').value = '';
  dialog.showModal();
}

/**
 * Close folder dialog
 */
function closeFolderDialog() {
  const dialog = document.getElementById('folder-dialog');
  dialog.close();
}

// ============================================
// EVENT LISTENERS FOR CARDS
// ============================================

/**
 * Attach event listeners to file cards
 */
function attachCardEventListeners() {
  // Card click to view file
  document.querySelectorAll('.file-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on action buttons
      if (e.target.closest('.action-btn') || e.target.closest('.file-card-actions')) {
        return;
      }
      const fileId = card.dataset.id;
      if (fileId) {
        window.location.href = `view.html?id=${fileId}`;
      }
    });
    // Add pointer cursor
    card.style.cursor = 'pointer';
  });

  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileId = btn.dataset.id;
      if (typeof handleEditFile === 'function') {
        handleEditFile(fileId);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileId = btn.dataset.id;
      if (typeof handleDeleteFile === 'function') {
        handleDeleteFile(fileId);
      }
    });
  });

  // Download buttons
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      const filename = btn.dataset.filename;
      downloadFile(url, filename);
    });
  });

  // Empty state add button
  const emptyAddBtn = document.getElementById('empty-add-btn');
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener('click', () => {
      if (typeof handleAddEntry === 'function') {
        handleAddEntry();
      }
    });
  }
}

/**
 * Download a file
 * @param {string} url 
 * @param {string} filename 
 */
function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date for display
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Escape HTML entities
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update entries count display
 * @param {number} count 
 */
function updateEntriesCount(count) {
  const countEl = document.getElementById('entries-count');
  if (countEl) {
    countEl.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
  }
}
