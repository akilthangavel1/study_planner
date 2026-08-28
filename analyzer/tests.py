import io
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from .engine import (
    extract_skills_from_text,
    estimate_experience_level,
    analyze_resume_and_recommend_pathway,
    CAREER_TRACKS,
    get_sample_resumes
)
from .forms import ResumeUploadForm

class EngineTestCase(TestCase):
    def test_skill_extraction(self):
        sample_text = "Proficient in Python, Django, PostgreSQL, Docker, and React. Built REST APIs."
        skills = extract_skills_from_text(sample_text)
        self.assertIn("Python", skills)
        self.assertIn("Django", skills)
        self.assertIn("PostgreSQL", skills)
        self.assertIn("Docker", skills)
        self.assertIn("React", skills)
        self.assertIn("REST APIs", skills)

    def test_experience_estimation(self):
        junior_text = "Junior Developer with 1 year of experience."
        senior_text = "Senior Software Architect with 8+ years of experience leading teams."
        
        jun_res = estimate_experience_level(junior_text)
        sen_res = estimate_experience_level(senior_text)
        
        self.assertEqual(jun_res["badge"], "Entry Level")
        self.assertEqual(sen_res["badge"], "Senior")

    def test_pathway_recommendation(self):
        python_text = "Python, Django, PostgreSQL, React, JavaScript, HTML, CSS, Git, Docker, REST"
        result = analyze_resume_and_recommend_pathway(python_text, weekly_hours=10)
        
        self.assertIsNotNone(result["primary_track"])
        self.assertEqual(result["primary_track"]["id"], "fullstack_dev")
        self.assertGreater(result["primary_track"]["match_score"], 50)
        self.assertEqual(len(result["roadmap"]), 4)
        self.assertGreater(result["total_estimated_weeks"], 0)

    def test_sample_resumes_validity(self):
        samples = get_sample_resumes()
        self.assertIn("junior_python_web", samples)
        self.assertIn("data_analyst_ml_aspirant", samples)
        self.assertIn("cloud_devops_aspirant", samples)


class ViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_index_get(self):
        response = self.client.get(reverse('analyzer:index'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Study Planner")
        self.assertContains(response, "Upload Your Resume")

    def test_index_post_valid_txt_file(self):
        resume_content = b"Alex Developer\nSkills: Python, Django, PostgreSQL, React, Docker, Git"
        uploaded_file = SimpleUploadedFile("resume.txt", resume_content, content_type="text/plain")
        
        response = self.client.post(reverse('analyzer:index'), {
            'resume_file': uploaded_file,
            'weekly_hours': 10,
            'career_goal': 'auto'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Compatibility")
        self.assertContains(response, "Personalized Phased Study Curriculum")

    def test_index_post_invalid_file_extension(self):
        file_content = b"Some binary executable content"
        uploaded_file = SimpleUploadedFile("malicious.exe", file_content, content_type="application/octet-stream")
        
        response = self.client.post(reverse('analyzer:index'), {
            'resume_file': uploaded_file,
            'weekly_hours': 10,
            'career_goal': 'auto'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Unsupported file format")

    def test_samples_api(self):
        response = self.client.get(reverse('analyzer:samples_api'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('samples', data)

    def test_export_study_path(self):
        # Trigger analysis to populate session
        resume_content = b"Python, Machine Learning, PyTorch, Pandas, NumPy, Deep Learning"
        uploaded_file = SimpleUploadedFile("resume.txt", resume_content, content_type="text/plain")
        self.client.post(reverse('analyzer:index'), {
            'resume_file': uploaded_file,
            'weekly_hours': 15,
            'career_goal': 'ai_ml'
        })
        
        # Test export
        export_resp = self.client.get(reverse('analyzer:export_study_path'))
        self.assertEqual(export_resp.status_code, 200)
        self.assertEqual(export_resp['Content-Type'], 'text/markdown')
        self.assertIn("Personalized Study Path", export_resp.content.decode('utf-8'))
