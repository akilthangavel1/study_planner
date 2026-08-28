import os
from django import forms
from django.core.exceptions import ValidationError
from .engine import CAREER_TRACKS

ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt']
MAX_FILE_SIZE_MB = 10

def validate_resume_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Please upload a PDF, DOCX, DOC, or TXT file."
        )
    if value.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValidationError(
            f"File size exceeds the {MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file."
        )


class ResumeUploadForm(forms.Form):
    WEEKLY_HOURS_CHOICES = [
        (5, "5 hrs / week — Relaxed Pace (~6-8 months)"),
        (10, "10 hrs / week — Steady & Recommended (~3-4 months)"),
        (15, "15 hrs / week — Accelerated Growth (~2-3 months)"),
        (20, "20 hrs / week — Intensive Sprint (~1.5-2 months)"),
        (30, "30 hrs / week — Full-Time Bootcamp (~1 month)"),
    ]

    GOAL_CHOICES = [
        ("auto", "✨ Auto-Detect My Optimal Study Path (Recommended)")
    ] + [(k, f"🎯 {v['title']}") for k, v in CAREER_TRACKS.items()]

    resume_file = forms.FileField(
        required=True,
        validators=[validate_resume_extension],
        widget=forms.FileInput(attrs={
            'id': 'resume-file-input',
            'class': 'hidden-file-input',
            'accept': '.pdf,.docx,.doc,.txt'
        }),
        label="Upload Resume"
    )

    weekly_hours = forms.TypedChoiceField(
        choices=WEEKLY_HOURS_CHOICES,
        coerce=int,
        initial=10,
        required=False,
        widget=forms.Select(attrs={
            'id': 'weekly-hours-select',
            'class': 'form-select-control'
        }),
        label="Weekly Study Commitment"
    )

    career_goal = forms.ChoiceField(
        choices=GOAL_CHOICES,
        initial="auto",
        required=False,
        widget=forms.Select(attrs={
            'id': 'career-goal-select',
            'class': 'form-select-control'
        }),
        label="Target Career Aspiration"
    )
