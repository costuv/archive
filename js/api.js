/**
 * Data API Module
 * Handles all CRUD operations for files and folders with Supabase
 */

// ============================================
// FILES API
// ============================================

/**
 * Get all files from database
 * @returns {Promise<Array>}
 */
async function getFiles() {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not initialized, using localStorage fallback');
    return getFilesFromLocalStorage();
  }

  try {
    console.log('Fetching files from Supabase...');
    const { data, error } = await supabase
      .from('files')
      .select(`
        *,
        folders:folder_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      return getFilesFromLocalStorage();
    }

    console.log('Files fetched successfully:', data?.length || 0, 'files');
    
    if (!data || data.length === 0) {
      console.log('No files found in database');
      return [];
    }

    // Transform data to match expected format
    return data.map(file => ({
      id: file.id,
      title: file.title,
      description: file.description,
      type: file.type,
      folderId: file.folder_id,
      folderName: file.folders?.name,
      tags: file.tags || [],
      fileUrl: file.file_url,
      thumbnailUrl: file.thumbnail_url,
      fileName: file.file_name,
      fileSize: file.file_size,
      createdAt: new Date(file.created_at),
      updatedAt: new Date(file.updated_at)
    }));
  } catch (err) {
    console.error('Error in getFiles:', err);
    return getFilesFromLocalStorage();
  }
}

/**
 * Create a new file entry
 * @param {Object} fileData 
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function createFile(fileData) {
  const supabase = getSupabase();
  if (!supabase) {
    return createFileInLocalStorage(fileData);
  }
  // Attempt insert with retries to handle transient network/RLS issues
  const maxAttempts = 3;
  let lastError = null;

  // Safely get session info for logging / RLS diagnostics
  try {
    const sessionResp = await supabase.auth.getSession();
    const session = sessionResp?.data?.session || null;
    console.log('Current session:', session ? 'Authenticated as ' + (session.user?.email || session.user?.id) : 'Not authenticated');
  } catch (e) {
    console.warn('Could not determine auth session before insert:', e?.message || e);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Creating file in database (attempt ${attempt}):`, fileData.title || fileData.fileName);
      const resp = await supabase
        .from('files')
        .insert({
          title: fileData.title,
          description: fileData.description,
          type: fileData.type,
          folder_id: fileData.folderId || null,
          tags: fileData.tags || [],
          file_url: fileData.fileUrl,
          thumbnail_url: fileData.thumbnailUrl,
          file_name: fileData.fileName,
          file_size: fileData.fileSize
        })
        .select();

      const { data, error } = resp;
      if (error) {
        lastError = error;
        console.error(`Database INSERT error (attempt ${attempt}):`, error);
        // If it's a permission/authorization error, don't retry
        const msg = (error && (error.message || '')).toLowerCase();
        if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('not authorized') || msg.includes('duplicate')) {
          return { success: false, error: error.message || JSON.stringify(error) };
        }
        // otherwise retry after delay
      } else if (data && data.length > 0) {
        // If insert returns array, return first row
        const created = Array.isArray(data) ? data[0] : data;
        console.log('File created successfully:', created);
        return { success: true, data: created };
      } else {
        // Unexpected empty response
        lastError = { message: 'Empty response from insert' };
        console.error('Empty response from insert', resp);
      }
    } catch (err) {
      lastError = err;
      console.error(`createFile exception (attempt ${attempt}):`, err);
    }

    // Exponential backoff before next attempt
    if (attempt < maxAttempts) {
      const waitMs = 250 * attempt;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      console.log(`Retrying createFile (attempt ${attempt + 1}) after ${waitMs}ms`);
    }
  }

  // All attempts failed
  const message = (lastError && (lastError.message || JSON.stringify(lastError))) || 'Unknown error';
  return { success: false, error: message };
}

/**
 * Update an existing file entry
 * @param {string} id 
 * @param {Object} fileData 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateFile(id, fileData) {
  const supabase = getSupabase();
  if (!supabase) {
    return updateFileInLocalStorage(id, fileData);
  }

  try {
    const { error } = await supabase
      .from('files')
      .update({
        title: fileData.title,
        description: fileData.description,
        type: fileData.type,
        folder_id: fileData.folderId || null,
        tags: fileData.tags || [],
        file_url: fileData.fileUrl,
        thumbnail_url: fileData.thumbnailUrl,
        file_name: fileData.fileName,
        file_size: fileData.fileSize,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a file entry
 * @param {string} id 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteFile(id) {
  const supabase = getSupabase();
  if (!supabase) {
    return deleteFileFromLocalStorage(id);
  }

  try {
    // First get the file to check for storage files
    const { data: file } = await supabase
      .from('files')
      .select('file_url, thumbnail_url')
      .eq('id', id)
      .single();

    // Delete from storage if applicable
    if (file?.file_url) {
      await deleteStorageFile(file.file_url);
    }
    if (file?.thumbnail_url && file.thumbnail_url !== file.file_url) {
      await deleteStorageFile(file.thumbnail_url);
    }

    // Delete from database
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================
// FOLDERS API
// ============================================

/**
 * Get all folders from database
 * @returns {Promise<Array>}
 */
async function getFolders() {
  const supabase = getSupabase();
  if (!supabase) {
    return getFoldersFromLocalStorage();
  }

  try {
    // Get folders
    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      return getFoldersFromLocalStorage();
    }

    // Get file counts per folder
    const { data: fileCounts } = await supabase
      .from('files')
      .select('folder_id')
      .not('folder_id', 'is', null);

    // Calculate counts
    const countMap = {};
    fileCounts?.forEach(f => {
      countMap[f.folder_id] = (countMap[f.folder_id] || 0) + 1;
    });

    return folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      count: countMap[folder.id] || 0
    }));
  } catch (err) {
    console.error('Error in getFolders:', err);
    return getFoldersFromLocalStorage();
  }
}

/**
 * Create a new folder
 * @param {string} name 
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function createFolder(name) {
  const supabase = getSupabase();
  if (!supabase) {
    return createFolderInLocalStorage(name);
  }

  try {
    const { data, error } = await supabase
      .from('folders')
      .insert({ name })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: data.id, name: data.name, count: 0 } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a folder
 * @param {string} id 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteFolder(id) {
  const supabase = getSupabase();
  if (!supabase) {
    return deleteFolderFromLocalStorage(id);
  }

  try {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================
// FILE STORAGE API
// ============================================

/**
 * Upload a file to Supabase Storage with progress tracking
 * @param {File} file 
 * @param {Function} onProgress - Callback for progress updates (percent, speed)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadFile(file, onProgress) {
  const supabase = getSupabase();
  if (!supabase) {
    // Return object URL for local testing
    if (onProgress) onProgress(100, 0);
    return { success: true, url: URL.createObjectURL(file) };
  }

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Get the Supabase URL and key for direct upload
    const supabaseUrl = 'https://ogwtptuzvcugxctveutc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nd3RwdHV6dmN1Z3hjdHZldXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTQ5MTYsImV4cCI6MjA4MjQ3MDkxNn0.MB7I1O897siTS1xAJegYoQigRUwmf0dFoerZORnN8Fs';
    
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          
          // Calculate speed
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000; // seconds
          const bytesDiff = e.loaded - lastLoaded;
          const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0; // bytes per second
          
          lastLoaded = e.loaded;
          lastTime = currentTime;
          
          onProgress(percent, speed);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get public URL
          const { data } = supabase.storage
            .from('archive-files')
            .getPublicUrl(filePath);
          
          resolve({ success: true, url: data.publicUrl });
        } else {
          let errorMsg = 'Upload failed';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.message || response.error || errorMsg;
          } catch (e) {}
          resolve({ success: false, error: errorMsg });
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error during upload' });
      });
      
      xhr.addEventListener('abort', () => {
        resolve({ success: false, error: 'Upload cancelled' });
      });
      
      // Open and send request
      xhr.open('POST', `${supabaseUrl}/storage/v1/object/archive-files/${filePath}`);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} url 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteStorageFile(url) {
  const supabase = getSupabase();
  if (!supabase || !url.includes('supabase')) {
    return { success: true };
  }

  try {
    // Extract path from URL
    const urlParts = url.split('/archive-files/');
    if (urlParts.length < 2) return { success: true };
    
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('archive-files')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting storage file:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Format file size for display
 * @param {number} bytes 
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// LOCALSTORAGE FALLBACK
// ============================================

function getFilesFromLocalStorage() {
  const stored = localStorage.getItem('archiveFiles');
  if (!stored) return [];
  
  try {
    const files = JSON.parse(stored);
    return files.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
      updatedAt: new Date(f.updatedAt)
    }));
  } catch {
    return [];
  }
}

function saveFilesToLocalStorage(files) {
  localStorage.setItem('archiveFiles', JSON.stringify(files));
}

function createFileInLocalStorage(fileData) {
  const files = getFilesFromLocalStorage();
  const newFile = {
    id: crypto.randomUUID(),
    ...fileData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  files.unshift(newFile);
  saveFilesToLocalStorage(files);
  return { success: true, data: newFile };
}

function updateFileInLocalStorage(id, fileData) {
  const files = getFilesFromLocalStorage();
  const index = files.findIndex(f => f.id === id);
  if (index === -1) {
    return { success: false, error: 'File not found' };
  }
  files[index] = { ...files[index], ...fileData, updatedAt: new Date() };
  saveFilesToLocalStorage(files);
  return { success: true };
}

function deleteFileFromLocalStorage(id) {
  const files = getFilesFromLocalStorage();
  const filtered = files.filter(f => f.id !== id);
  saveFilesToLocalStorage(filtered);
  return { success: true };
}

function getFoldersFromLocalStorage() {
  const stored = localStorage.getItem('archiveFolders');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveFoldersToLocalStorage(folders) {
  localStorage.setItem('archiveFolders', JSON.stringify(folders));
}

function createFolderInLocalStorage(name) {
  const folders = getFoldersFromLocalStorage();
  const newFolder = {
    id: crypto.randomUUID(),
    name,
    count: 0
  };
  folders.push(newFolder);
  saveFoldersToLocalStorage(folders);
  return { success: true, data: newFolder };
}

function deleteFolderFromLocalStorage(id) {
  const folders = getFoldersFromLocalStorage();
  const filtered = folders.filter(f => f.id !== id);
  saveFoldersToLocalStorage(filtered);
  return { success: true };
}

/**
 * Recalculate folder counts
 * @param {Array} files 
 * @param {Array} folders 
 * @returns {Array} Updated folders with correct counts
 */
function recalculateFolderCounts(files, folders) {
  const countMap = {};
  files.forEach(f => {
    if (f.folderId) {
      countMap[f.folderId] = (countMap[f.folderId] || 0) + 1;
    }
  });
  
  return folders.map(folder => ({
    ...folder,
    count: countMap[folder.id] || 0
  }));
}
