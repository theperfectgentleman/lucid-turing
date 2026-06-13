import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, Trash2, Edit3, Search, AlertCircle, Check, Loader, Filter, X, ArrowLeft, ArrowRight } from 'lucide-react';

export default function AdminConfig({ setView }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manage'
  
  // Tab 1: Upload & Extract
  const [importMode, setImportMode] = useState('image'); // 'image' or 'paste'
  const [pastedText, setPastedText] = useState('');
  const [pasteCategory, setPasteCategory] = useState('Other');
  const [uploadTag, setUploadTag] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedWords, setExtractedWords] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Tab 2: Manage Words Database
  const [dbWords, setDbWords] = useState([]);
  const [dbTags, setDbTags] = useState([]);
  const [dbTag, setDbTag] = useState('');
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPage, setDbPage] = useState(1);
  const [dbLimit] = useState(25);
  const [dbSearch, setDbSearch] = useState('');
  const [dbCategory, setDbCategory] = useState('');
  const [dbLoading, setDbLoading] = useState(false);
  
  // Edit Word Modal
  const [editingWord, setEditingWord] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Tab 3: Manage User Profiles
  const [userProfiles, setUserProfiles] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserProfileId, setEditingUserProfileId] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPin, setEditUserPin] = useState('');

  useEffect(() => {
    fetchDbWords();
    fetchDbTags();
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchDbWords();
      fetchDbTags();
    }
    if (activeTab === 'users') {
      fetchUserProfiles();
    }
  }, [activeTab, dbPage, dbCategory, dbTag]);

  // Trigger search on debounce or submit
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setDbPage(1);
    fetchDbWords();
  };

  const fetchDbWords = async () => {
    try {
      setDbLoading(true);
      const queryParams = new URLSearchParams({
        page: dbPage,
        limit: dbLimit,
        search: dbSearch,
        category: dbCategory,
        tag: dbTag
      });
      const res = await fetch(`/api/admin/words?${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch words');
      const data = await res.json();
      setDbWords(data.words || []);
      setDbTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setDbLoading(false);
    }
  };

  const fetchDbTags = async () => {
    try {
      const res = await fetch('/api/words/tags');
      if (res.ok) {
        const data = await res.json();
        setDbTags(data.tags || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserProfiles = async () => {
    try {
      setUsersLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUserProfiles(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    if (e) e.preventDefault();
    if (!newUserName.trim() || !newUserPin.trim()) {
      alert("Name and PIN are required.");
      return;
    }
    if (newUserPin.trim().length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim(), pin: newUserPin.trim() })
      });
      if (res.ok) {
        setNewUserName('');
        setNewUserPin('');
        fetchUserProfiles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create profile');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user profile? All spelling progress for this user will be permanently deleted.")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUserProfiles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete user profile');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleEditUserClick = (user) => {
    setEditingUserProfileId(user.id);
    setEditUserName(user.name);
    setEditUserPin(user.pin);
  };

  const handleCancelUserEdit = () => {
    setEditingUserProfileId(null);
    setEditUserName('');
    setEditUserPin('');
  };

  const handleSaveUserEdit = async (userId) => {
    if (!editUserName.trim() || !editUserPin.trim()) {
      alert("Name and PIN are required.");
      return;
    }
    if (editUserPin.trim().length < 4) {
      alert("PIN must be at least 4 digits.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserName.trim(), pin: editUserPin.trim() })
      });
      if (res.ok) {
        handleCancelUserEdit();
        fetchUserProfiles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update profile');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedWords([]);
      setSaveStatus(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExtractedWords([]);
      setSaveStatus(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    
    try {
      setIsExtracting(true);
      setSaveStatus(null);
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('tag', uploadTag);
      
      const res = await fetch('/api/admin/extract-words', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Extraction failed');
      }
      
      const data = await res.json();
      // Add a 'selected' flag to all extracted words by default (select new words, deselect already existing ones)
      const wordsWithSelection = (data.words || []).map(w => ({
        ...w,
        selected: !w.alreadyExists
      }));
      
      setExtractedWords(wordsWithSelection);
    } catch (error) {
      console.error(error);
      alert(`Error extracting words: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractPastedText = async () => {
    if (!pastedText.trim()) {
      alert("Please paste some text first.");
      return;
    }
    
    try {
      setIsExtracting(true);
      setSaveStatus(null);
      
      const res = await fetch('/api/admin/extract-pasted-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText, category: pasteCategory, tag: uploadTag })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Extraction failed');
      }
      
      const data = await res.json();
      // Add a 'selected' flag to all extracted words by default (select new words, deselect already existing ones)
      const wordsWithSelection = (data.words || []).map(w => ({
        ...w,
        selected: !w.alreadyExists
      }));
      
      setExtractedWords(wordsWithSelection);
    } catch (error) {
      console.error(error);
      alert(`Error extracting words: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractedWordChange = (index, field, value) => {
    const updated = [...extractedWords];
    updated[index][field] = value;
    setExtractedWords(updated);
  };

  const toggleSelectWord = (index) => {
    const updated = [...extractedWords];
    updated[index].selected = !updated[index].selected;
    setExtractedWords(updated);
  };

  const handleSaveBatch = async () => {
    const wordsToSave = extractedWords.filter(w => w.selected);
    if (wordsToSave.length === 0) {
      alert("No words selected to save.");
      return;
    }

    try {
      setIsExtracting(true);
      const res = await fetch('/api/admin/save-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToSave })
      });

      if (!res.ok) throw new Error('Failed to save words');
      const data = await res.json();
      
      setSaveStatus({
        added: data.addedCount,
        skipped: data.skippedCount
      });
      // Clear extracted list or mark them saved
      setExtractedWords([]);
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Update database list and count/tags immediately
      fetchDbWords();
      fetchDbTags();
    } catch (e) {
      console.error(e);
      alert("Error saving words database: " + e.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!confirm("Are you sure you want to delete this word from the database?")) return;
    try {
      const res = await fetch(`/api/admin/words/${wordId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchDbWords();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleEditClick = (word) => {
    setEditingWord({ ...word });
  };

  const handleSaveEdit = async () => {
    if (!editingWord) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/admin/words/${editingWord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingWord)
      });
      if (!res.ok) throw new Error("Update failed");
      
      setEditingWord(null);
      fetchDbWords();
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleMorphemeChange = (index, field, value) => {
    if (!editingWord) return;
    const morphemes = [...(editingWord.morphemes || [])];
    morphemes[index][field] = value;
    setEditingWord({ ...editingWord, morphemes });
  };

  const addMorphemeField = () => {
    if (!editingWord) return;
    const morphemes = [...(editingWord.morphemes || []), { text: '', type: 'syllable', meaning: '' }];
    setEditingWord({ ...editingWord, morphemes });
  };

  const removeMorphemeField = (index) => {
    if (!editingWord) return;
    const morphemes = (editingWord.morphemes || []).filter((_, i) => i !== index);
    setEditingWord({ ...editingWord, morphemes });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Admin Configuration</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload spelling bee pages or manage database words.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setView('dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="nav-links" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '1px' }}>
        <button className={`nav-button ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
          <Upload size={16} /> Upload Booklet Page
        </button>
        <button className={`nav-button ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>
          <Search size={16} /> Manage Words ({dbTotal})
        </button>
        <button className={`nav-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          👤 User Profiles
        </button>
      </div>

      {/* TAB 1: UPLOAD AND EXTRACT */}
      {activeTab === 'upload' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: (importMode === 'paste' || previewUrl) ? '320px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Upload Area / Paste Area */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button 
                  className={`btn ${importMode === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '8px', fontSize: '14px', fontWeight: 'bold' }}
                  onClick={() => {
                    setImportMode('image');
                    setExtractedWords([]);
                    setSaveStatus(null);
                  }}
                >
                  Image Upload
                </button>
                <button 
                  className={`btn ${importMode === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '8px', fontSize: '14px', fontWeight: 'bold' }}
                  onClick={() => {
                    setImportMode('paste');
                    setExtractedWords([]);
                    setSaveStatus(null);
                  }}
                >
                  Paste Text
                </button>
              </div>

              {importMode === 'image' ? (
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Select Booklet Page Image</h3>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '500' }}>Booklet Tag / Group</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Group 6" 
                      value={uploadTag} 
                      onChange={(e) => setUploadTag(e.target.value)} 
                      className="form-control" 
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                  <div 
                    className="upload-zone"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                    <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>Drag & drop image here</p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or click to browse files</span>
                  </div>

                  {previewUrl && (
                    <div style={{ marginTop: '20px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Image Preview:</p>
                      <img src={previewUrl} alt="Preview" style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={handleExtract} disabled={isExtracting}>
                        {isExtracting ? (
                          <>
                            <Loader size={16} className="spinner" /> Extracting Words...
                          </>
                        ) : (
                          'Analyze Image with Gemini'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Paste Word List</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Paste words here. Separations (spaces, newlines, commas, columns, or bullet points) are robustly detected.
                  </p>
                  
                  <textarea
                    placeholder="Enter words or copy-paste list here...&#10;e.g.&#10;1. cacophony&#10;2. archetype&#10;3. reservoir&#10;Or: acoustic, sound, frequency"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="form-control"
                    style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }}
                  />

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', display: 'block', fontWeight: '500' }}>
                      Target Language of Origin (Category)
                    </label>
                    <select
                      value={['Afrikaans', 'French', 'Greek', 'Latin', 'German', 'Dutch', 'Italian'].includes(pasteCategory) ? pasteCategory : 'Other'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          setPasteCategory('Other');
                        } else {
                          setPasteCategory(val);
                        }
                      }}
                      className="form-control"
                      style={{ marginBottom: '8px' }}
                    >
                      <option value="Other">Other / Custom</option>
                      <option value="Afrikaans">Afrikaans</option>
                      <option value="French">French</option>
                      <option value="Greek">Greek</option>
                      <option value="Latin">Latin</option>
                      <option value="German">German</option>
                      <option value="Dutch">Dutch</option>
                      <option value="Italian">Italian</option>
                    </select>
                    
                    {(!['Afrikaans', 'French', 'Greek', 'Latin', 'German', 'Dutch', 'Italian'].includes(pasteCategory) || pasteCategory === 'Other') && (
                      <input
                        type="text"
                        placeholder="Enter custom category name (e.g. Arabic)..."
                        value={pasteCategory === 'Other' ? '' : pasteCategory}
                        onChange={(e) => setPasteCategory(e.target.value || 'Other')}
                        className="form-control"
                        style={{ fontSize: '13px' }}
                      />
                    )}
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px', display: 'block', fontWeight: '500' }}>
                      Booklet Tag / Group
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Group 6" 
                      value={uploadTag} 
                      onChange={(e) => setUploadTag(e.target.value)} 
                      className="form-control" 
                      style={{ fontSize: '13px' }}
                    />
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '8px' }} 
                    onClick={handleExtractPastedText} 
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <>
                        <Loader size={16} className="spinner" /> Parsing Words...
                      </>
                    ) : (
                      'Verify & Parse Words'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Results & Editor Panel */}
            <div className="card" style={{ minHeight: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px' }}>Extracted Words Editor</h3>
                {extractedWords.length > 0 && (
                  <button className="btn btn-accent" onClick={handleSaveBatch} disabled={isExtracting}>
                    <Save size={16} /> Save Selected Words ({extractedWords.filter(w => w.selected).length})
                  </button>
                )}
              </div>

              {isExtracting && (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Loader size={40} className="spinner" style={{ color: 'var(--primary-hover)', marginBottom: '16px' }} />
                  <h4>{importMode === 'image' ? 'Gemini is reading the image booklet...' : 'Gemini is processing your pasted words...'}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                    Extracting spellings, detecting origin languages, and auto-generating definitions & Lego block breakdowns.
                  </p>
                </div>
              )}

              {saveStatus && (
                <div className="card" style={{ background: 'var(--success-glow)', borderColor: 'var(--success)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 'bold' }}>
                    <Check size={20} /> Words Database Updated!
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>
                    Successfully imported <strong>{saveStatus.added}</strong> new words into your spelling database. 
                    Skipped <strong>{saveStatus.skipped}</strong> words that were already present to avoid duplication.
                  </p>
                </div>
              )}

              {!isExtracting && extractedWords.length === 0 && !saveStatus && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                  <AlertCircle size={36} style={{ marginBottom: '12px' }} />
                  <p>
                    {importMode === 'image' 
                      ? 'Upload a spelling booklet page on the left and click "Analyze Image" to extract words.'
                      : 'Paste spelling bee words on the left and click "Verify & Parse Words" to process them.'
                    }
                  </p>
                </div>
              )}

              {/* Extracted word cards listing */}
              {!isExtracting && extractedWords.length > 0 && (
                <div className="ocr-result-grid" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                  {extractedWords.map((wordData, idx) => (
                    <div 
                      key={idx} 
                      className={`extracted-word-card ${!wordData.selected ? 'skipped' : ''}`}
                      style={{ borderLeft: `4px solid ${wordData.alreadyExists ? 'var(--error)' : 'var(--success)'}` }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={wordData.selected} 
                          onChange={() => toggleSelectWord(idx)} 
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ flexGrow: '1' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={wordData.word} 
                              onChange={(e) => handleExtractedWordChange(idx, 'word', e.target.value)}
                              className="form-control" 
                              style={{ fontWeight: '700', fontSize: '18px', padding: '4px 8px', width: '220px' }}
                            />
                            {wordData.alreadyExists ? (
                              <span className="badge badge-exists">Already in DB (Will Skip)</span>
                            ) : (
                              <span className="badge badge-new">New Word</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {wordData.selected && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px', paddingLeft: '30px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Language of Origin (Category)</label>
                            <input 
                              type="text" 
                              value={wordData.category} 
                              onChange={(e) => handleExtractedWordChange(idx, 'category', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Booklet Tag / Group</label>
                            <input 
                              type="text" 
                              value={wordData.tag || ''} 
                              onChange={(e) => handleExtractedWordChange(idx, 'tag', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Part of Speech</label>
                            <input 
                              type="text" 
                              value={wordData.part_of_speech} 
                              onChange={(e) => handleExtractedWordChange(idx, 'part_of_speech', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 3' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Definition</label>
                            <input 
                              type="text" 
                              value={wordData.definition} 
                              onChange={(e) => handleExtractedWordChange(idx, 'definition', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 3' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Context Sentence</label>
                            <input 
                              type="text" 
                              value={wordData.sentence} 
                              onChange={(e) => handleExtractedWordChange(idx, 'sentence', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 3' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Spelling Tip</label>
                            <input 
                              type="text" 
                              value={wordData.spelling_tip} 
                              onChange={(e) => handleExtractedWordChange(idx, 'spelling_tip', e.target.value)}
                              className="form-control" 
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE DATABASE */}
      {activeTab === 'manage' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>Database Words Inventory</h3>
            
            {/* Search and Filters */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexGrow: '1', maxWidth: '600px' }}>
              <div style={{ position: 'relative', flexGrow: '1' }}>
                <input 
                  type="text" 
                  placeholder="Search words..." 
                  value={dbSearch} 
                  onChange={(e) => setDbSearch(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '36px' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
              <select 
                value={dbCategory} 
                onChange={(e) => { setDbCategory(e.target.value); setDbPage(1); }}
                className="form-control"
                style={{ width: '130px' }}
              >
                <option value="">All Origins</option>
                <option value="Afrikaans">Afrikaans</option>
                <option value="French">French</option>
                <option value="Greek">Greek</option>
                <option value="Latin">Latin</option>
                <option value="German">German</option>
                <option value="Dutch">Dutch</option>
                <option value="Italian">Italian</option>
                <option value="Other">Other</option>
              </select>
              <select 
                value={dbTag} 
                onChange={(e) => { setDbTag(e.target.value); setDbPage(1); }}
                className="form-control"
                style={{ width: '120px' }}
              >
                <option value="">All Tags</option>
                {dbTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary">
                Search
              </button>
            </form>
          </div>

          {dbLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Loader size={24} className="spinner" /> Loading Database Words...
            </div>
          ) : dbWords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              <AlertCircle size={32} style={{ marginBottom: '12px' }} />
              <p>No words found matching the filters. Add more words by uploading an image!</p>
            </div>
          ) : (
            <div>
              <div className="words-table-wrapper">
                <table className="words-table">
                  <thead>
                    <tr>
                      <th>Word</th>
                      <th>Origin</th>
                      <th>Tag</th>
                      <th>Part of Speech</th>
                      <th>Definition</th>
                      <th>SRS Box</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbWords.map(w => (
                      <tr key={w.id}>
                        <td style={{ fontWeight: '700', fontSize: '15px' }}>{w.word}</td>
                        <td>
                          <span className="origin-badge" style={{ fontSize: '12px', padding: '3px 8px' }}>
                            {w.category}
                          </span>
                        </td>
                        <td>
                          {w.tag && (
                            <span className="origin-badge" style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                              {w.tag}
                            </span>
                          )}
                        </td>
                        <td style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{w.part_of_speech}</td>
                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)' }}>
                          {w.definition}
                        </td>
                        <td>
                          <span style={{ fontWeight: 'bold', color: w.box === 5 ? 'var(--success)' : 'var(--text-primary)' }}>
                            Box {w.box}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="nav-button" style={{ padding: '6px', color: 'var(--primary-hover)' }} onClick={() => handleEditClick(w)} title="Edit Word">
                              <Edit3 size={16} />
                            </button>
                            <button className="nav-button" style={{ padding: '6px', color: 'var(--error)' }} onClick={() => handleDeleteWord(w.id)} title="Delete Word">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Showing {(dbPage - 1) * dbLimit + 1} - {Math.min(dbPage * dbLimit, dbTotal)} of {dbTotal} words
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setDbPage(p => Math.max(1, p - 1))} disabled={dbPage === 1}>
                    <ArrowLeft size={14} /> Prev
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setDbPage(p => p + 1)} disabled={dbPage * dbLimit >= dbTotal}>
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* TAB 3: USER PROFILES */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
          
          {/* Create User Profile */}
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Create User Profile</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Profile Name</label>
                <input 
                  type="text" 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g., John, Sarah, etc."
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Access PIN Code</label>
                <input 
                  type="text" 
                  maxLength="8"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 1234"
                  className="form-control"
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  A numeric code (4 to 8 digits) the student will type to login.
                </span>
              </div>
              <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '10px' }}>
                Create Profile
              </button>
            </form>
          </div>

          {/* User Profiles List */}
          <div className="card" style={{ minHeight: '300px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Existing Profiles</h3>
            
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Loader className="spinner" size={24} /> Loading user profiles...
              </div>
            ) : userProfiles.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '32px' }}>
                No user profiles found. Create one on the left!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userProfiles.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)' }}>
                    {editingUserProfileId === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, marginRight: '16px' }}>
                        <input
                          type="text"
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="form-control"
                          style={{ fontSize: '14px', padding: '6px 10px' }}
                          placeholder="Name"
                          required
                        />
                        <input
                          type="text"
                          maxLength="8"
                          value={editUserPin}
                          onChange={(e) => setEditUserPin(e.target.value.replace(/\D/g, ''))}
                          className="form-control"
                          style={{ fontSize: '14px', padding: '6px 10px' }}
                          placeholder="PIN code"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <strong style={{ fontSize: '16px', display: 'block' }}>{u.name}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          PIN code: <strong style={{ color: 'var(--accent)' }}>{u.pin}</strong>
                        </span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {editingUserProfileId === u.id ? (
                        <>
                          <button className="btn btn-accent" style={{ padding: '6px 12px', minWidth: 'auto', fontSize: '13px' }} onClick={() => handleSaveUserEdit(u.id)}>
                            Save
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', minWidth: 'auto', fontSize: '13px' }} onClick={handleCancelUserEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '8px', minWidth: 'auto' }} onClick={() => handleEditUserClick(u)} title="Edit Profile">
                            <Edit3 size={16} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '8px', minWidth: 'auto' }} onClick={() => handleDeleteUser(u.id)} title="Delete Profile">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}


      {/* EDIT MODAL DIALOG */}
      {editingWord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '20px' }}>Edit Database Word: {editingWord.word}</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }} onClick={() => setEditingWord(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Word spelling</label>
                <input 
                  type="text" 
                  value={editingWord.word} 
                  onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })} 
                  className="form-control" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Language of Origin (Category)</label>
                  <input 
                    type="text" 
                    value={editingWord.category} 
                    onChange={(e) => setEditingWord({ ...editingWord, category: e.target.value })} 
                    className="form-control" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Booklet Tag / Group</label>
                  <input 
                    type="text" 
                    value={editingWord.tag || ''} 
                    onChange={(e) => setEditingWord({ ...editingWord, tag: e.target.value })} 
                    className="form-control" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Part of Speech</label>
                  <input 
                    type="text" 
                    value={editingWord.part_of_speech} 
                    onChange={(e) => setEditingWord({ ...editingWord, part_of_speech: e.target.value })} 
                    className="form-control" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Definition</label>
                <textarea 
                  rows="2"
                  value={editingWord.definition} 
                  onChange={(e) => setEditingWord({ ...editingWord, definition: e.target.value })} 
                  className="form-control" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sentence</label>
                <textarea 
                  rows="2"
                  value={editingWord.sentence} 
                  onChange={(e) => setEditingWord({ ...editingWord, sentence: e.target.value })} 
                  className="form-control" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Spelling Tip / Rules</label>
                <input 
                  type="text" 
                  value={editingWord.spelling_tip} 
                  onChange={(e) => setEditingWord({ ...editingWord, spelling_tip: e.target.value })} 
                  className="form-control" 
                />
              </div>

              {/* Lego Blocks (Morpheme Breakdown Editor) */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Lego Blocks (Morpheme Breakdown)</label>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={addMorphemeField}>
                    + Add Block
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(editingWord.morphemes || []).map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Block Text" 
                        value={m.text} 
                        onChange={(e) => handleMorphemeChange(idx, 'text', e.target.value)} 
                        className="form-control"
                        style={{ flex: 2, padding: '6px' }}
                      />
                      <select 
                        value={m.type} 
                        onChange={(e) => handleMorphemeChange(idx, 'type', e.target.value)} 
                        className="form-control"
                        style={{ flex: 2, padding: '6px' }}
                      >
                        <option value="prefix">Prefix</option>
                        <option value="root">Root</option>
                        <option value="suffix">Suffix</option>
                        <option value="syllable">Syllable</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Meaning (optional)" 
                        value={m.meaning || ''} 
                        onChange={(e) => handleMorphemeChange(idx, 'meaning', e.target.value)} 
                        className="form-control"
                        style={{ flex: 3, padding: '6px' }}
                      />
                      <button className="btn btn-danger" style={{ padding: '6px', minWidth: 'auto' }} onClick={() => removeMorphemeField(idx)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setEditingWord(null)} disabled={isSavingEdit}>
                  Cancel
                </button>
                <button className="btn btn-accent" onClick={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Word'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
