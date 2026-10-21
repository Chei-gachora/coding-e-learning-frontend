from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection, transaction
from django.core.exceptions import ValidationError


class ExecuteView(APIView):
    """
    Generic execution endpoint.
    POST /api/execute/
    
    Expected body:
    {
        "action": "run_query" | "grade_quiz" | "custom",
        "payload": { ... }
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get("action")
        payload = request.data.get("payload", {})

        if not action:
            return Response(
                {"error": "Field 'action' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if action == "run_query":
                result = self._run_query(payload)
            elif action == "grade_quiz":
                result = self._grade_quiz(payload, request.user)
            else:
                return Response(
                    {"error": f"Unknown action: {action}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                "status": "success",
                "action": action,
                "data": result
            })

        except ValidationError as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _run_query(self, payload):
        """
        Safe parameterized query execution against MSSQL.
        Only allows SELECT by default for security.
        """
        sql = payload.get("sql")
        params = payload.get("params", [])

        if not sql:
            raise ValidationError("payload.sql is required")

        # Basic safety: only allow SELECT statements
        cleaned_sql = sql.strip().lower()
        if not cleaned_sql.startswith("select"):
            raise ValidationError("Only SELECT queries are allowed in this endpoint")

        with connection.cursor() as cursor:
            cursor.execute(sql, params)

            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                return {
                    "columns": columns,
                    "rows": [dict(zip(columns, row)) for row in rows],
                    "row_count": len(rows)
                }
            return {"row_count": 0}

    def _grade_quiz(self, payload, user):
        """
        Example grading logic.
        Replace with your real QuizAttempt / Submission models.
        """
        quiz_id = payload.get("quiz_id")
        answers = payload.get("answers", {})

        if not quiz_id:
            raise ValidationError("payload.quiz_id is required")

        # --- Replace this section with your real models ---
        # from yourapp.models import Quiz, QuizAttempt, Question
        #
        # quiz = Quiz.objects.get(pk=quiz_id)
        # attempt = QuizAttempt.objects.create(
        #     quiz=quiz,
        #     user=user,
        #     answers=answers
        # )
        # score = attempt.calculate_score()   # your method
        # attempt.score = score
        # attempt.save()
        # return {"attempt_id": attempt.id, "score": score}
        # -------------------------------------------------

        # Temporary placeholder response
        return {
            "quiz_id": quiz_id,
            "user": user.username,
            "message": "Grading logic placeholder – replace with real models",
            "received_answers": answers
        }