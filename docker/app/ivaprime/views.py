from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt

# Create your views here.
def home(request):
    return render(request, 'ivaprime/index.html')

def about(request):
    return render(request, 'ivaprime/about.html')

def mobile(request):
    return render(request, 'ivaprime/mobile.html')


@csrf_exempt
def bypass_mobile(request):
    response = redirect('/')
    response.set_cookie('bypass_mobile', '1', max_age=60 * 60 * 24)  # 1 day
    return response