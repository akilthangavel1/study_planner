from django.urls import path
from . import views

app_name = 'analyzer'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/samples/', views.sample_resumes_api, name='samples_api'),
    path('export/', views.export_study_path, name='export_study_path'),
]
