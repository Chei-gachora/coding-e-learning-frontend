from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return super().authenticate(request)

        django_request = request._request
        csrf_check = CsrfViewMiddleware(lambda req: None)
        csrf_check.process_request(django_request)
        reason = csrf_check.process_view(
            django_request,
            lambda req: None,
            (),
            {},
        )
        if reason:
            raise PermissionDenied(f"CSRF Failed: {reason}")

        validated_token = self.get_validated_token(raw_token.encode())
        return self.get_user(validated_token), validated_token
