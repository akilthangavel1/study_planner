/**
 * Study Planner AI - Frontend Interactive Logic
 * Handles file dropzone, validation, dynamic sample selection, AJAX submission,
 * interactive milestone checklist states, and track switching using Bootstrap 5.
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
        // Clicking dropzone triggers file input
        dropZone.addEventListener('click', (e) => {
            if (e.target.closest('#btn-remove-file')) return;
            if (fileInput) {
                fileInput.click();
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-warning', 'bg-body-secondary');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-warning', 'bg-body-secondary');
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
        if (previewFilename) previewFilename.textContent = file.name;
        if (previewFilesize) previewFilesize.textContent = sizeFormatted;

        if (dropzonePrompt) dropzonePrompt.classList.add('d-none');
        if (filePreview) {
            filePreview.classList.remove('d-none');
            filePreview.classList.add('d-flex');
        }

        // Clear sample text if user chose a real file
        if (sampleTextInput) {
            sampleTextInput.value = '';
        }
    }

    function clearFileSelection() {
        if (fileInput) fileInput.value = '';
        if (sampleTextInput) sampleTextInput.value = '';
        if (dropzonePrompt) dropzonePrompt.classList.remove('d-none');
        if (filePreview) {
            filePreview.classList.add('d-none');
            filePreview.classList.remove('d-flex');
        }
    }

    // ------------------------------------------------------------------------
    // 2. Form Submission State
    // ------------------------------------------------------------------------
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
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
            if (btnText) btnText.classList.add('d-none');
            if (btnLoading) {
                btnLoading.classList.remove('d-none');
                btnLoading.classList.add('d-flex');
            }
            btnAnalyze.disabled = true;
        } else {
            if (btnText) btnText.classList.remove('d-none');
            if (btnLoading) {
                btnLoading.classList.add('d-none');
                btnLoading.classList.remove('d-flex');
            }
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
    // 6. Dynamic Client-Side Result Renderer (Bootstrap 5 CDN Compatible)
    // ------------------------------------------------------------------------
    function renderDynamicResults(data) {
        const root = document.getElementById('results-container');
        if (!root) return;

        const track = data.primary_track;

        let acquiredTags = '';
        if (track.all_acquired && track.all_acquired.length > 0) {
            acquiredTags = track.all_acquired.map(s => `
                <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-6 rounded-pill d-inline-flex align-items-center gap-1">
                    <i data-lucide="check"></i> ${s}
                </span>
            `).join('');
        } else {
            acquiredTags = '<p class="text-secondary small mb-0">No direct domain skill overlaps found. You are starting with a fresh slate!</p>';
        }

        let missingTags = '';
        if (track.all_missing && track.all_missing.length > 0) {
            missingTags = track.all_missing.map(s => `
                <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-6 rounded-pill d-inline-flex align-items-center gap-1">
                    <i data-lucide="arrow-up-right"></i> ${s}
                </span>
            `).join('');
        } else {
            missingTags = '<span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-6 rounded-pill d-inline-flex align-items-center gap-1"><i data-lucide="award"></i> All Core Skills Mastered!</span>';
        }

        let roadmapPhasesHtml = data.roadmap.map(phase => {
            const topicsHtml = phase.topics.map((t, idx) => `
                <div class="col-12 col-md-6">
                    <div class="form-check card card-body bg-body-secondary border-0 p-3 rounded-3 flex-row align-items-center gap-2">
                        <input class="form-check-input topic-checkbox m-0" type="checkbox" data-phase="${phase.phase_num}" id="dyn-phase-${phase.phase_num}-topic-${idx}">
                        <label class="form-check-label text-body w-100" for="dyn-phase-${phase.phase_num}-topic-${idx}">
                            ${t}
                        </label>
                    </div>
                </div>
            `).join('');

            const resourcesHtml = phase.resources.map(r => `
                <div class="col-12 col-md-6">
                    <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="card card-body bg-body-secondary border-0 rounded-3 text-decoration-none text-body p-3 h-100 d-flex flex-row justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2 text-truncate">
                            <i data-lucide="book-bookmark" class="text-primary flex-shrink-0"></i>
                            <span class="fw-medium text-truncate">${r.name}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 flex-shrink-0">
                            <span class="badge ${r.free ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}">${r.free ? 'Free' : 'Paid'}</span>
                            <i data-lucide="arrow-up-right" class="text-secondary"></i>
                        </div>
                    </a>
                </div>
            `).join('');

            return `
                <div class="card bg-body border border-secondary-subtle rounded-4 p-4 shadow-sm" data-phase="${phase.phase_num}">
                    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary fs-6 px-3 py-2 rounded-pill">Phase ${phase.phase_num}</span>
                            <h3 class="h5 fw-bold mb-0">${phase.title}</h3>
                        </div>
                        <div class="badge bg-body-secondary text-secondary-emphasis border border-secondary-subtle px-3 py-2 rounded-pill">
                            <i data-lucide="clock" class="me-1"></i> ${phase.estimated_weeks} Weeks (${phase.duration_hours} Hours)
                            <span class="ms-1">| ${phase.start_date} - ${phase.end_date}</span>
                        </div>
                    </div>
                    <p class="mb-4"><strong>Core Focus:</strong> <span class="text-secondary">${phase.focus}</span></p>
                    <div class="mb-4">
                        <h4 class="h6 fw-bold mb-3 d-flex align-items-center gap-2">
                            <i data-lucide="list-checks" class="text-primary"></i> Key Learning Modules & Topics:
                        </h4>
                        <div class="row g-2">${topicsHtml}</div>
                    </div>
                    <div class="mb-4">
                        <h4 class="h6 fw-bold mb-3 d-flex align-items-center gap-2">
                            <i data-lucide="external-link" class="text-primary"></i> Recommended Learning Resources:
                        </h4>
                        <div class="row g-2">${resourcesHtml}</div>
                    </div>
                    <div class="alert alert-primary d-flex align-items-start gap-3 mb-0 rounded-3" role="alert">
                        <div class="text-primary fs-4 mt-1"><i data-lucide="trophy"></i></div>
                        <div>
                            <strong class="d-block mb-1">Phase ${phase.phase_num} Capstone Milestone:</strong>
                            <div class="small">${phase.milestone}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let certsHtml = track.recommended_certifications.map(c => `
            <div class="col-12 col-md-4">
                <div class="card bg-body border-secondary-subtle p-3 rounded-3 h-100 d-flex flex-row align-items-center gap-3">
                    <div class="bg-success-subtle text-success p-2 rounded-2">
                        <i data-lucide="shield-check"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${c}</div>
                        <small class="text-secondary">Industry Recognized Credential</small>
                    </div>
                </div>
            </div>
        `).join('');

        let altTracksHtml = data.alternative_tracks.map(alt => `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card bg-body border-secondary-subtle rounded-4 p-4 h-100 d-flex flex-column justify-content-between shadow-sm" data-track-id="${alt.id}">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${alt.match_score}% Match</span>
                            <span class="badge bg-secondary">${alt.category}</span>
                        </div>
                        <h4 class="h5 fw-bold mb-2">${alt.title}</h4>
                        <p class="text-secondary small mb-3">${alt.tagline}</p>
                        <div class="row g-2 text-center mb-4">
                            <div class="col-6">
                                <div class="bg-body-secondary p-2 rounded-2">
                                    <div class="fw-bold text-success">${alt.acquired_core ? alt.acquired_core.length : 0}</div>
                                    <small class="text-secondary" style="font-size: 0.75rem;">Skills Owned</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="bg-body-secondary p-2 rounded-2">
                                    <div class="fw-bold text-warning">${alt.missing_core ? alt.missing_core.length : 0}</div>
                                    <small class="text-secondary" style="font-size: 0.75rem;">Core Gaps</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline-primary w-100 btn-switch-track d-flex align-items-center justify-content-center gap-2" data-track-id="${alt.id}">
                        View This Study Path <i data-lucide="arrow-right"></i>
                    </button>
                </div>
            </div>
        `).join('');

        root.innerHTML = `
            <!-- Results Header / Summary Banner Card -->
            <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 p-md-5 mb-4">
                <div class="row align-items-center g-4">
                    <div class="col-12 col-lg-3 text-center">
                        <div class="card bg-body border-primary border-opacity-50 p-4 rounded-4 shadow-sm text-center">
                            <div class="display-4 fw-extrabold text-primary mb-1">${track.match_score}%</div>
                            <div class="fw-semibold text-secondary-emphasis">Compatibility</div>
                            <div class="progress mt-3" role="progressbar" aria-label="Compatibility Score" aria-valuenow="${track.match_score}" aria-valuemin="0" aria-valuemax="100" style="height: 8px;">
                                <div class="progress-bar bg-primary progress-bar-striped progress-bar-animated" style="width: ${track.match_score}%;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-5">
                        <div class="d-flex flex-wrap gap-2 mb-3">
                            <span class="badge bg-primary">${track.category}</span>
                            <span class="badge bg-secondary"><i data-lucide="user-check" class="me-1"></i> ${data.candidate_experience.level}</span>
                            <span class="badge bg-success-subtle text-success border border-success-subtle"><i data-lucide="trending-up" class="me-1"></i> ${track.demand} Demand</span>
                        </div>
                        <h2 class="h3 fw-bold mb-2">${track.title}</h2>
                        <p class="text-secondary mb-3">${track.tagline}</p>
                        
                        <div>
                            <span class="fw-semibold small text-secondary-emphasis d-block mb-2">Target Career Roles:</span>
                            <div class="d-flex flex-wrap gap-1">
                                ${track.target_roles.map(r => `<span class="badge bg-body-secondary text-body border border-secondary-subtle px-2 py-1">${r}</span>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-4">
                        <div class="card bg-body border-secondary-subtle p-3 rounded-3 mb-3">
                            <div class="d-flex align-items-center gap-3 mb-2">
                                <div class="bg-primary-subtle text-primary p-2 rounded-2"><i data-lucide="clock"></i></div>
                                <div>
                                    <div class="fw-bold">${data.total_estimated_weeks} Weeks</div>
                                    <small class="text-secondary">@ ${data.weekly_hours} hrs/week</small>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-3 mb-2">
                                <div class="bg-success-subtle text-success p-2 rounded-2"><i data-lucide="calendar"></i></div>
                                <div>
                                    <div class="fw-bold">${data.completion_date}</div>
                                    <small class="text-secondary">Est. Completion</small>
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-warning-subtle text-warning p-2 rounded-2"><i data-lucide="currency-dollar"></i></div>
                                <div>
                                    <div class="fw-bold">${track.avg_salary_range}</div>
                                    <small class="text-secondary">Avg. Industry Compensation</small>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex flex-column gap-2">
                            <a href="/export/" class="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center gap-2" id="btn-export-md">
                                <i data-lucide="download"></i> Export Study Guide (.md)
                            </a>
                            <button type="button" class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-2" onclick="window.print()">
                                <i data-lucide="printer"></i> Print / Save PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SKILLS GAP & BREAKDOWN GRID -->
            <div class="row g-4 mb-4">
                <div class="col-12 col-md-6">
                    <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 h-100">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="bg-success-subtle text-success rounded-3 p-2"><i data-lucide="check-circle-2"></i></div>
                            <div>
                                <h3 class="h5 fw-bold mb-0">Acquired Competencies Detected</h3>
                                <small class="text-secondary">${track.all_acquired ? track.all_acquired.length : 0} skills matched from your resume</small>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-2">${acquiredTags}</div>
                    </div>
                </div>

                <div class="col-12 col-md-6">
                    <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 h-100">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="bg-primary-subtle text-primary rounded-3 p-2"><i data-lucide="book-open"></i></div>
                            <div>
                                <h3 class="h5 fw-bold mb-0">Identified Skill Gaps to Bridge</h3>
                                <small class="text-secondary">${track.all_missing ? track.all_missing.length : 0} target skills to master in this curriculum</small>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-2">${missingTags}</div>
                    </div>
                </div>
            </div>

            <!-- INTERACTIVE PHASED LEARNING ROADMAP -->
            <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 p-md-5 mb-4">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom border-secondary-subtle">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-primary-subtle text-primary rounded-3 p-3"><i data-lucide="map"></i></div>
                        <div>
                            <h2 class="h4 fw-bold mb-1">Personalized Phased Study Curriculum</h2>
                            <p class="text-secondary small mb-0">Structured in 4 sequential learning milestones tailored to your pace.</p>
                        </div>
                    </div>
                    <div>
                        <span class="badge bg-body text-body border border-secondary-subtle px-3 py-2 fs-6 rounded-pill" id="task-progress-tracker">
                            <i data-lucide="check-square" class="me-1"></i> <span id="completed-tasks-count">0</span> of <span id="total-tasks-count">0</span> Milestones Completed
                        </span>
                    </div>
                </div>

                <div class="d-flex flex-column gap-4">${roadmapPhasesHtml}</div>
            </div>

            <!-- INDUSTRY CERTIFICATIONS -->
            <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 p-md-5 mb-4">
                <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-secondary-subtle">
                    <div class="bg-primary-subtle text-primary rounded-3 p-3"><i data-lucide="award"></i></div>
                    <div>
                        <h3 class="h4 fw-bold mb-1">Recommended Industry Certifications</h3>
                        <p class="text-secondary small mb-0">High-value credentials that solidify your portfolio for recruiter screening.</p>
                    </div>
                </div>
                <div class="row g-3">${certsHtml}</div>
            </div>

            <!-- ALTERNATIVE CAREER PATHWAYS -->
            <div class="card bg-body-tertiary border border-secondary-subtle shadow-sm rounded-4 p-4 p-md-5 mb-4">
                <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-secondary-subtle">
                    <div class="bg-primary-subtle text-primary rounded-3 p-3"><i data-lucide="git-branch"></i></div>
                    <div>
                        <h3 class="h4 fw-bold mb-1">Explore Alternative Career Pathways</h3>
                        <p class="text-secondary small mb-0">How your skills match with other specialized technology trajectories.</p>
                    </div>
                </div>
                <div class="row g-4">${altTracksHtml}</div>
            </div>
        `;

        root.classList.remove('d-none');

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
