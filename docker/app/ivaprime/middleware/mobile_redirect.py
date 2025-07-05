from django.shortcuts import redirect
from user_agents import parse

class MobileRedirectMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip redirect if user opted out
        if request.COOKIES.get('bypass_mobile') == '1' or request.path.startswith('/bypass-mobile'):
            return self.get_response(request)

        # Avoid redirect loop
        if request.path.startswith('/mobile'):
            return self.get_response(request)

        user_agent = parse(request.META.get('HTTP_USER_AGENT', ''))
        if user_agent.is_mobile:
            return redirect('/mobile/')

        return self.get_response(request)
