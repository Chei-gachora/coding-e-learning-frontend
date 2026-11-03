from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from hashlib import sha256
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public self-registration. Deliberately does NOT expose `role` —
    anyone POSTing here becomes a student, full stop. Instructor and
    admin accounts are created through Django admin (/admin/) by
    someone who already has admin access, not through this open
    endpoint. (Earlier testing caught this: without this restriction,
    anyone could register with role=admin in the request body.)
    """
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_username(self, value):
        # "Ann" and "ann" must not both exist — they look identical to people.
        username = value.strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("That username is already taken.")
        return username

    def validate(self, attrs):
        user = User(
            username=attrs.get("username", ""),
            email=attrs.get("email", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(
            **validated_data,
            role="student",
            email_verified=False,
            is_approved=False,
            is_active=False,
        )
        user.set_password(password)
        user.save()
        return user


class EmailActionSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class ExternalProviderLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(max_length=8192, trim_whitespace=True)
    nonce = serializers.CharField(max_length=128, trim_whitespace=True)


class DetailResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class EmailTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class PasswordResetSerializer(EmailTokenSerializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)


class UserSerializer(serializers.ModelSerializer):
    profile_photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "bio",
            "profile_photo",
            "leaderboard_opt_in",
        ]
        read_only_fields = ["id", "username", "email", "role"]

    def validate_profile_photo(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Profile photos must be 5 MB or smaller.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Profile photos are private account data; fetch them through the
        # authenticated endpoint rather than exposing a public media URL.
        photo_version = (
            sha256(instance.profile_photo.name.encode()).hexdigest()[:12]
            if instance.profile_photo
            else ""
        )
        data["profile_photo"] = (
            f"/auth/me/profile-photo/?v={photo_version}"
            if photo_version
            else None
        )
        return data
