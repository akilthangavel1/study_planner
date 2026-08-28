/**
 * Study Planner AI - Frontend Interactive Logic
 * Handles file dropzone, validation, dynamic sample selection, AJAX submission,
 * interactive accordion milestones, checklist states, and theme interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Element references
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('resume-file-input');
    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const filePreview = document.getElementById('file-preview');
    const previewFilename = document.getElementById('preview-filename');
    const previewFilesize = document.getElementById('preview-filesize');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const uploadForm = document.getElementById('resume-upload-form');
    const btnAnalyze = document.getElementById('btn-analyze');
    const sampleButtons = document.querySelectorAll('.btn-sample');
    const weeklyHoursSelect = document.getElementById('weekly-hours-select');
    const careerGoalSelect = document.getElementById('career-goal-select');
    const resultsContainer = document.getElementById('results-container');
    const sampleTextInput = document.getElementById('sample-text-input');

    let currentAnalysisData = null;

    // ------------------------------------------------------------------------
    // 1. Drag & Drop File Upload Interactions
    // ------------------------------------------------------------------------
    if (dropZone && fileInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length > 0) {
                handleFileSelection(fileInput.files[0]);
            }
        });

        if (btnRemoveFile) {
            btnRemoveFile.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearFileSelection();
            });
        }
    }

    function handleFileSelection(file) {
        if (!file) return;
        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        previewFilename.textContent = file.name;
        previewFilesize.textContent = sizeFormatted;

        dropzonePrompt.classList.add('hidden');
        filePreview.classList.remove('hidden');

        // Clear sample text if user chose a real file
        if (sampleTextInput) {
            sampleTextInput.value = '';
        }
    }

    function clearFileSelection() {
        if (fileInput) fileInput.value = '';
        if (sampleTextInput) sampleTextInput.value = '';
        dropzonePrompt.classList.remove('hidden');
        filePreview.classList.add('hidden');
    }

    // ------------------------------------------------------------------------
    // 2. Form Submission State
    // ------------------------------------------------------------------------
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            // Check if file is selected or sample text is filled
            const hasFile = fileInput && fileInput.files.length > 0;
            const hasSample = sampleTextInput && sampleTextInput.value.trim().length > 0;

            if (!hasFile && !hasSample) {
                e.preventDefault();
                alert('Please upload a resume file (PDF, DOCX, TXT) or click one of the instant sample profiles below.');
                return;
            }

            setLoadingState(true);
        });
    }

    function setLoadingState(isLoading) {
        if (!btnAnalyze) return;
        const btnText = btnAnalyze.querySelector('.btn-text');
        const btnLoading = btnAnalyze.querySelector('.btn-loading');

        if (isLoading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            btnAnalyze.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            btnAnalyze.disabled = false;
        }
    }

    // ------------------------------------------------------------------------
    // 3. Instant Sample Profile Testing (AJAX Analysis)
    // ------------------------------------------------------------------------
    sampleButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const sampleKey = btn.getAttribute('data-sample');
            setLoadingState(true);

            try {
                // Fetch sample data from API
                const resp = await fetch('/api/samples/');
                const data = await resp.json();

                if (data.samples && data.samples[sampleKey]) {
                    const sample = data.samples[sampleKey];
                    const weeklyHours = weeklyHoursSelect ? weeklyHoursSelect.value : 10;
                    const careerGoal = careerGoalSelect ? careerGoalSelect.value : 'auto';

                    // Send AJAX post to analyze
                    const analyzeResp = await fetch('/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRFToken': getCsrfToken()
                        },
                        body: JSON.stringify({
                            raw_text: sample.text,
                            weekly_hours: weeklyHours,
                            career_goal: careerGoal
                        })
                    });

                    const analyzeResult = await analyzeResp.json();
                    if (analyzeResult.success) {
                        currentAnalysisData = analyzeResult.data;
                        renderDynamicResults(analyzeResult.data);
                    } else {
                        alert('Analysis error: ' + (analyzeResult.error || 'Unknown error'));
                    }
                }
            } catch (err) {
                console.error('Error fetching sample:', err);
                alert('Error loading sample profile. Please try again.');
            } finally {
                setLoadingState(false);
            }
        });
    });

    // ------------------------------------------------------------------------
    // 4. Interactive Milestone Checklist Tracker
    // ------------------------------------------------------------------------
    initMilestoneTracker();

    function initMilestoneTracker() {
        const checkboxes = document.querySelectorAll('.topic-checkbox');
        const countSpan = document.getElementById('completed-tasks-count');
        const totalSpan = document.getElementById('total-tasks-count');

        if (totalSpan) {
            totalSpan.textContent = checkboxes.length;
        }

        function updateCount() {
            const checked = document.querySelectorAll('.topic-checkbox:checked').length;
            if (countSpan) countSpan.textContent = checked;
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateCount);
        });

        updateCount();
    }

    // ------------------------------------------------------------------------
    // 5. Alternative Track Switching
    // ------------------------------------------------------------------------
    attachSwitchTrackListeners();

    function attachSwitchTrackListeners() {
        document.querySelectorAll('.btn-switch-track').forEach(btn => {
            btn.addEventListener('click', () => {
                const trackId = btn.getAttribute('data-track-id');
                if (careerGoalSelect) {
                    careerGoalSelect.value = trackId;
                }

                // If we have currentAnalysisData or raw text, recalculate
                if (currentAnalysisData && currentAnalysisData.raw_text_snippet) {
                    reAnalyzeWithTrack(trackId);
                } else if (uploadForm) {
                    // Scroll to top and highlight
                    uploadForm.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    async function reAnalyzeWithTrack(trackId) {
        setLoadingState(true);
        try {
            const weeklyHours = weeklyHoursSelect ? weeklyHoursSelect.value : 10;
            const resp = await fetch('/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    raw_text: currentAnalysisData.raw_text_snippet,
                    weekly_hours: weeklyHours,
                    career_goal: trackId
                })
            });

            const result = await resp.json();
            if (result.success) {
                currentAnalysisData = result.data;
                renderDynamicResults(result.data);
            }
        } catch (e) {
            console.error('Error switching track:', e);
        } finally {
            setLoadingState(false);
        }
    }

    // ------------------------------------------------------------------------
    // 6. Dynamic Client-Side Result Renderer (for seamless AJAX testing)
    // ------------------------------------------------------------------------
    function renderDynamicResults(data) {
        const root = document.getElementById('results-container');
        if (!root) return;

        const track = data.primary_track;

        let acquiredTags = '';
        if (track.all_acquired && track.all_acquired.length > 0) {
            acquiredTags = track.all_acquired.map(s => `
                <span class="skill-tag tag-acquired">
                    <i data-lucide="check"></i> ${s}
                </span>
            `).join('');
        } else {
            acquiredTags = '<p class="empty-state-text">No direct domain skill overlaps found. You are starting fresh!</p>';
        }

        let missingTags = '';
        if (track.all_missing && track.all_missing.length > 0) {
            missingTags = track.all_missing.map(s => `
                <span class="skill-tag tag-gap">
                    <i data-lucide="arrow-up-right"></i> ${s}
                </span>
            `).join('');
        } else {
            missingTags = '<span class="skill-tag tag-acquired"><i data-lucide="award"></i> All Core Skills Mastered!</span>';
        }

        let roadmapPhasesHtml = data.roadmap.map(phase => {
            const topicsHtml = phase.topics.map(t => `
                <li class="topic-item">
                    <label class="custom-checkbox-wrap">
                        <input type="checkbox" class="topic-checkbox" data-phase="${phase.phase_num}">
                        <span class="checkbox-box"></span>
                        <span class="topic-text">${t}</span>
                    </label>
                </li>
            `).join('');

            const resourcesHtml = phase.resources.map(r => `
                <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="resource-link-card">
                    <div class="resource-info">
                        <i data-lucide="book-bookmark" class="resource-icon"></i>
                        <span class="resource-name">${r.name}</span>
                    </div>
                    <div class="resource-badges">
                        <span class="${r.free ? 'badge-free' : 'badge-paid'}">${r.free ? 'Free' : 'Paid / Premium'}</span>
                        <i data-lucide="arrow-up-right" class="arrow-icon"></i>
                    </div>
                </a>
            `).join('');

            return `
                <div class="timeline-phase-card" data-phase="${phase.phase_num}">
                    <div class="phase-indicator">
                        <div class="phase-circle">${phase.phase_num}</div>
                        <div class="phase-connector"></div>
                    </div>
                    <div class="phase-body glass-card-nested">
                        <div class="phase-header">
                            <div class="phase-title-group">
                                <span class="phase-badge">Phase ${phase.phase_num}</span>
                                <h3 class="phase-name">${phase.title}</h3>
                            </div>
                            <div class="phase-time-badge">
                                <i data-lucide="clock"></i> ${phase.estimated_weeks} Weeks (${phase.duration_hours} Hours)
                                <span class="phase-dates">| ${phase.start_date} - ${phase.end_date}</span>
                            </div>
                        </div>
                        <p class="phase-focus"><strong>Core Focus:</strong> ${phase.focus}</p>
                        <div class="curriculum-block">
                            <h4 class="curriculum-heading"><i data-lucide="list-checks"></i> Key Learning Modules & Topics:</h4>
                            <ul class="topics-checklist">${topicsHtml}</ul>
                        </div>
                        <div class="resources-block">
                            <h4 class="resources-heading"><i data-lucide="external-link"></i> Recommended Learning Resources:</h4>
                            <div class="resources-grid">${resourcesHtml}</div>
                        </div>
                        <div class="milestone-box">
                            <div class="milestone-icon"><i data-lucide="trophy"></i></div>
                            <div class="milestone-content">
                                <strong>Phase ${phase.phase_num} Capstone Milestone:</strong>
                                <p>${phase.milestone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let certsHtml = track.recommended_certifications.map(c => `
            <div class="cert-item-card">
                <div class="cert-badge-icon"><i data-lucide="shield-check"></i></div>
                <div class="cert-details">
                    <span class="cert-title">${c}</span>
                    <span class="cert-validation">Industry Recognized Credential</span>
                </div>
            </div>
        `).join('');

        let altTracksHtml = data.alternative_tracks.map(alt => `
            <div class="alt-track-card" data-track-id="${alt.id}">
                <div class="alt-card-top">
                    <span class="alt-match-pill">${alt.match_score}% Match</span>
                    <span class="alt-category">${alt.category}</span>
                </div>
                <h4 class="alt-title">${alt.title}</h4>
                <p class="alt-desc">${alt.tagline}</p>
                <div class="alt-skills-summary">
                    <div class="alt-stat">
                        <span class="stat-num text-emerald">${alt.acquired_core ? alt.acquired_core.length : 0}</span>
                        <span class="stat-lbl">Core Skills Owned</span>
                    </div>
                    <div class="alt-stat">
                        <span class="stat-num text-amber">${alt.missing_core ? alt.missing_core.length : 0}</span>
                        <span class="stat-lbl">Core Gaps</span>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-sm btn-switch-track" data-track-id="${alt.id}">
                    View This Study Path <i data-lucide="arrow-right"></i>
                </button>
            </div>
        `).join('');

        const strokeDashoffset = 364.4 - (364.4 * track.match_score) / 100;

        root.innerHTML = `
            <!-- Results Header / Summary Banner -->
            <div class="glass-card result-hero-card">
                <div class="result-hero-layout">
                    <div class="match-score-gauge">
                        <div class="score-circle">
                            <svg class="progress-ring" width="140" height="140">
                                <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.08)" stroke-width="10" fill="transparent" r="58" cx="70" cy="70"/>
                                <circle class="progress-ring-fill" stroke="url(#scoreGradient)" stroke-width="10" stroke-linecap="round" fill="transparent" r="58" cx="70" cy="70" style="stroke-dasharray: 364.4; stroke-dashoffset: ${strokeDashoffset};"/>
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#38bdf8"/>
                                        <stop offset="50%" stop-color="#818cf8"/>
                                        <stop offset="100%" stop-color="#c084fc"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div class="score-content">
                                <span class="score-number">${track.match_score}%</span>
                                <span class="score-label">Compatibility</span>
                            </div>
                        </div>
                    </div>

                    <div class="result-details">
                        <div class="track-badge-row">
                            <span class="track-badge category-badge">${track.category}</span>
                            <span class="track-badge exp-badge"><i data-lucide="user-check"></i> ${data.candidate_experience.level}</span>
                            <span class="track-badge demand-badge"><i data-lucide="trending-up"></i> ${track.demand} Demand</span>
                        </div>
                        <h2 class="result-track-title">${track.title}</h2>
                        <p class="result-tagline">${track.tagline}</p>
                        
                        <div class="target-roles-wrap">
                            <span class="roles-label">Target Roles:</span>
                            ${track.target_roles.map(r => `<span class="role-pill">${r}</span>`).join('')}
                        </div>
                    </div>

                    <div class="result-meta-card">
                        <div class="meta-item">
                            <div class="meta-icon"><i data-lucide="clock"></i></div>
                            <div>
                                <span class="meta-value">${data.total_estimated_weeks} Weeks</span>
                                <span class="meta-label">@ ${data.weekly_hours} hrs/week</span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-icon"><i data-lucide="calendar"></i></div>
                            <div>
                                <span class="meta-value">${data.completion_date}</span>
                                <span class="meta-label">Est. Completion</span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-icon"><i data-lucide="dollar-sign"></i></div>
                            <div>
                                <span class="meta-value">${track.avg_salary_range}</span>
                                <span class="meta-label">Avg. Industry Compensation</span>
                            </div>
                        </div>

                        <div class="result-actions">
                            <a href="/export/" class="btn btn-secondary btn-sm">
                                <i data-lucide="download"></i> Export Study Guide (.md)
                            </a>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">
                                <i data-lucide="printer"></i> Print / Save PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SKILLS GAP & BREAKDOWN GRID -->
            <div class="skills-gap-grid">
                <div class="glass-card skill-card acquired-card">
                    <div class="skill-card-header">
                        <div class="skill-header-icon text-emerald"><i data-lucide="check-circle-2"></i></div>
                        <div>
                            <h3 class="skill-card-title">Acquired Competencies Detected</h3>
                            <span class="skill-card-subtitle">${track.all_acquired ? track.all_acquired.length : 0} skills matched from your resume</span>
                        </div>
                    </div>
                    <div class="skill-tags-list">${acquiredTags}</div>
                </div>

                <div class="glass-card skill-card gap-card">
                    <div class="skill-card-header">
                        <div class="skill-header-icon text-indigo"><i data-lucide="book-open"></i></div>
                        <div>
                            <h3 class="skill-card-title">Identified Skill Gaps to Bridge</h3>
                            <span class="skill-card-subtitle">${track.all_missing ? track.all_missing.length : 0} target skills to master in this curriculum</span>
                        </div>
                    </div>
                    <div class="skill-tags-list">${missingTags}</div>
                </div>
            </div>

            <!-- INTERACTIVE PHASED LEARNING ROADMAP -->
            <div class="glass-card roadmap-container">
                <div class="roadmap-header">
                    <div class="roadmap-title-wrap">
                        <div class="icon-bubble"><i data-lucide="map"></i></div>
                        <div>
                            <h2 class="section-title">Personalized Phased Study Curriculum</h2>
                            <p class="section-subtitle">Structured in 4 sequential learning milestones tailored to your pace.</p>
                        </div>
                    </div>
                    <div class="roadmap-controls">
                        <span class="completion-counter" id="task-progress-tracker">
                            <i data-lucide="check-square"></i> <span id="completed-tasks-count">0</span> of <span id="total-tasks-count">0</span> Milestones Completed
                        </span>
                    </div>
                </div>

                <div class="timeline-wrapper">${roadmapPhasesHtml}</div>
            </div>

            <!-- INDUSTRY CERTIFICATIONS -->
            <div class="glass-card certs-card">
                <div class="certs-header">
                    <div class="icon-bubble"><i data-lucide="award"></i></div>
                    <div>
                        <h3 class="section-title">Recommended Industry Certifications</h3>
                        <p class="section-subtitle">High-value credentials that solidify your portfolio for recruiter screening.</p>
                    </div>
                </div>
                <div class="certs-grid">${certsHtml}</div>
            </div>

            <!-- ALTERNATIVE CAREER PATHWAYS -->
            <div class="glass-card alt-tracks-container">
                <div class="alt-header">
                    <div class="icon-bubble"><i data-lucide="git-branch"></i></div>
                    <div>
                        <h3 class="section-title">Explore Alternative Career Pathways</h3>
                        <p class="section-subtitle">How your skills match with other specialized technology trajectories.</p>
                    </div>
                </div>
                <div class="alt-tracks-grid">${altTracksHtml}</div>
            </div>
        `;

        root.classList.remove('hidden');

        // Re-initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Re-attach interactive milestone and track-switch listeners
        initMilestoneTracker();
        attachSwitchTrackListeners();

        // Smooth scroll to results
        root.scrollIntoView({ behavior: 'smooth' });
    }

    function getCsrfToken() {
        const input = document.querySelector('[name=csrfmiddlewaretoken]');
        return input ? input.value : '';
    }
});
