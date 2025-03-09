from django.shortcuts import render

# Create your views here.
def home(request):
    return render(request, 'ivaprime/index.html')

def about(request):
    return render(request, 'ivaprime/about.html')