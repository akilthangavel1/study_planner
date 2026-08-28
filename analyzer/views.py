import json
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .forms import ResumeUploadForm
from .engine import (
    extract_text_from_file,
    analyze_resume_and_recommend_pathway,
    get_sample_resumes,
    CAREER_TRACKS
)

def index(request):
    """
    Main single-form view:
    - Renders the upload form.
    - Processes uploaded resume files.
    - Generates personalized study path and roadmaps.
    """
    form = ResumeUploadForm()
    analysis_result = None
    error_message = None
    
    if request.method == "POST":
        # Check if it's an AJAX JSON request (e.g. testing with sample resume)
        if request.headers.get('x-requested-with') == 'XMLHttpRequest' and request.content_type == 'application/json':
            try:
                data = json.loads(request.body.decode('utf-8'))
                raw_text = data.get('raw_text', '')
                weekly_hours = int(data.get('weekly_hours', 10))
                career_goal = data.get('career_goal', 'auto')
                preferred_track = None if career_goal == 'auto' else career_goal
                
                if not raw_text.strip():
                    return JsonResponse({'success': False, 'error': 'Resume text content is empty.'}, status=400)
                    
                result = analyze_resume_and_recommend_pathway(
                    raw_text=raw_text,
                    weekly_hours=weekly_hours,
                    preferred_track=preferred_track
                )
                return JsonResponse({'success': True, 'data': result})
            except Exception as e:
                return JsonResponse({'success': False, 'error': str(e)}, status=500)
                
        # Standard multipart form upload
        form = ResumeUploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = form.cleaned_data['resume_file']
            weekly_hours = form.cleaned_data.get('weekly_hours') or 10
            career_goal = form.cleaned_data.get('career_goal') or 'auto'
            preferred_track = None if career_goal == 'auto' else career_goal
            
            try:
                extracted_text = extract_text_from_file(uploaded_file, uploaded_file.name)
                if not extracted_text or len(extracted_text.strip()) < 20:
                    error_message = "Could not extract sufficient text from the uploaded document. Please check the file or upload another resume."
                else:
                    analysis_result = analyze_resume_and_recommend_pathway(
                        raw_text=extracted_text,
                        weekly_hours=weekly_hours,
                        preferred_track=preferred_track
                    )
                    # Store in session for easy export
                    request.session['last_analysis'] = analysis_result
            except Exception as e:
                error_message = f"Error processing resume: {str(e)}"
        else:
            errors = []
            for field, errs in form.errors.items():
                errors.extend(errs)
            error_message = " ".join(errors)

    # Samples available for instant testing
    samples = get_sample_resumes()
    
    context = {
        'form': form,
        'analysis': analysis_result,
        'error_message': error_message,
        'samples': samples,
        'tracks': CAREER_TRACKS,
    }
    return render(request, 'analyzer/index.html', context)


def sample_resumes_api(request):
    """API endpoint to get sample resume data."""
    samples = get_sample_resumes()
    return JsonResponse({'samples': samples})


def export_study_path(request):
    """
    Exports the generated study path as a downloadable Markdown study guide.
    """
    analysis = request.session.get('last_analysis')
    if not analysis:
        # Fallback if session expired, parse from GET params or sample
        return HttpResponse("No active study path analysis found to export. Please analyze a resume first.", status=404)
        
    track = analysis['primary_track']
    lines = [
        f"# Personalized Study Path: {track['title']}",
        f"**Target Role:** {', '.join(track['target_roles'])}",
        f"**Match Score:** {track['match_score']}% | **Readiness:** {analysis['candidate_experience']['level']}",
        f"**Estimated Time:** {analysis['total_estimated_weeks']} weeks ({analysis['total_estimated_hours']} hours @ {analysis['weekly_hours']} hrs/week)",
        f"**Target Completion:** {analysis['completion_date']}",
        "",
        "---",
        "## 1. Skill Gap Analysis",
        f"### Acquired Skills ({len(track['all_acquired'])}):",
        ", ".join(track['all_acquired']) if track['all_acquired'] else "None detected",
        "",
        f"### Skills to Acquire / Gaps ({len(track['all_missing'])}):",
        ", ".join(track['all_missing']) if track['all_missing'] else "All core skills detected!",
        "",
        "---",
        "## 2. Phased Learning Roadmap",
    ]
    
    for phase in analysis['roadmap']:
        lines.append(f"### Phase {phase['phase_num']}: {phase['title']}")
        lines.append(f"**Duration:** {phase['estimated_weeks']} weeks ({phase['duration_hours']} hours) | **Dates:** {phase['start_date']} - {phase['end_date']}")
        lines.append(f"**Focus:** {phase['focus']}")
        lines.append("\n**Key Topics:**")
        for topic in phase['topics']:
            lines.append(f"- [ ] {topic}")
        lines.append("\n**Curated Learning Resources:**")
        for res in phase['resources']:
            badge = "(Free)" if res['free'] else "(Paid/Freemium)"
            lines.append(f"- [{res['name']}]({res['url']}) {badge}")
        lines.append(f"\n**Milestone Capstone:** {phase['milestone']}\n")
        
    lines.append("---")
    lines.append("## 3. Recommended Industry Certifications")
    for cert in track['recommended_certifications']:
        lines.append(f"- {cert}")
        
    md_content = "\n".join(lines)
    
    response = HttpResponse(md_content, content_type='text/markdown')
    response['Content-Disposition'] = f'attachment; filename="study_path_{track["id"]}.md"'
    return response
