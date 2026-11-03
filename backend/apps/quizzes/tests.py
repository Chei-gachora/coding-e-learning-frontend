from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.testing import World


class QuizAuthoringApiTests(TestCase):
	def setUp(self):
		self.world = World()
		self.instructor = APIClient()
		self.instructor.force_authenticate(user=self.world.instructor_a)
		self.student = APIClient()
		self.student.force_authenticate(user=self.world.student_1)

	def test_quiz_title_comes_from_activity_and_student_questions_hide_answers(self):
		response = self.student.get(f"/api/quizzes/{self.world.quiz.id}/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["title"], self.world.quiz.activity.title)
		self.assertNotIn("correct_choice_index", response.data["questions"][0])

	def test_instructor_can_create_and_list_questions_for_owned_course(self):
		created = self.instructor.post("/api/quiz-questions/", {
			"quiz": self.world.quiz.id,
			"text": "Which answer is correct?",
			"marks": 2,
			"choices": [{"text": "First"}, {"text": "Second"}],
			"correct_choice_index": 1,
		}, format="json")

		self.assertEqual(created.status_code, 201, created.data)
		self.assertEqual(created.data["correct_choice_index"], 1)
		listed = self.instructor.get(f"/api/quiz-questions/?quiz={self.world.quiz.id}")
		self.assertEqual(len(listed.data), 2)

	def test_student_cannot_access_answer_key_endpoint(self):
		response = self.student.get(f"/api/quiz-questions/?quiz={self.world.quiz.id}")

		self.assertEqual(response.status_code, 403)

	def test_instructor_cannot_create_question_for_another_instructors_quiz(self):
		other_activity = self.world.b_act
		other_activity.activity_type = "quiz"
		other_activity.save(update_fields=["activity_type"])
		from .models import Quiz
		other_quiz = Quiz.objects.create(activity=other_activity)

		response = self.instructor.post("/api/quiz-questions/", {
			"quiz": other_quiz.id,
			"text": "Unauthorized question",
			"marks": 1,
			"choices": [{"text": "A"}, {"text": "B"}],
			"correct_choice_index": 0,
		}, format="json")

		self.assertEqual(response.status_code, 403)

	def test_invalid_correct_choice_index_is_rejected(self):
		response = self.instructor.post("/api/quiz-questions/", {
			"quiz": self.world.quiz.id,
			"text": "Invalid index",
			"marks": 1,
			"choices": [{"text": "Only choice"}, {"text": "Another choice"}],
			"correct_choice_index": 2,
		}, format="json")

		self.assertEqual(response.status_code, 400)


class QuizBuilderApiTests(TestCase):
	def setUp(self):
		self.world = World()
		self.instructor = APIClient()
		self.instructor.force_authenticate(user=self.world.instructor_a)
		self.foreign_instructor = APIClient()
		self.foreign_instructor.force_authenticate(user=self.world.instructor_b)
		self.student = APIClient()
		self.student.force_authenticate(user=self.world.student_1)

	def payload(self, lesson_id):
		return {
			"lesson": lesson_id,
			"activity": {"title": "Python basics", "max_attempts": 2, "pass_percentage": 70},
			"quiz": {"time_limit_minutes": 15, "pass_mark_percentage": 70},
			"questions": [{
				"text": "Which function displays output?",
				"marks": 2,
				"choices": [{"text": "print"}, {"text": "input"}],
				"correct_choice_index": 0,
			}],
		}

	def test_build_creates_quiz_activity_and_question(self):
		payload = self.payload(self.world.l1.id)
		payload["activity"]["is_final_assessment"] = True
		response = self.instructor.post("/api/quizzes/build/", payload, format="json")

		self.assertEqual(response.status_code, 201, response.data)
		self.assertEqual(response.data["activity"]["activity_type"], "quiz")
		self.assertTrue(response.data["activity"]["is_final_assessment"])
		self.assertEqual(response.data["activity"]["quiz_id"], response.data["quiz"]["id"])
		self.assertEqual(len(response.data["questions"]), 1)
		self.assertEqual(response.data["questions"][0]["correct_choice_index"], 0)
		student_view = self.student.get(f"/api/quizzes/{response.data['quiz']['id']}/")
		self.assertEqual(student_view.status_code, 200)
		self.assertNotIn("correct_choice_index", student_view.data["questions"][0])
		duplicate_final = self.payload(self.world.l1.id)
		duplicate_final["activity"]["title"] = "Second final"
		duplicate_final["activity"]["is_final_assessment"] = True
		rejected = self.instructor.post("/api/quizzes/build/", duplicate_final, format="json")
		self.assertEqual(rejected.status_code, 400, rejected.data)
		self.assertFalse(self.world.l1.activities.filter(title="Second final").exists())

	def test_invalid_question_rolls_back_activity_and_quiz(self):
		payload = self.payload(self.world.l1.id)
		payload["questions"][0]["choices"] = [{"text": "Only one"}]

		response = self.instructor.post("/api/quizzes/build/", payload, format="json")

		self.assertEqual(response.status_code, 400)
		self.assertFalse(self.world.l1.activities.filter(title="Python basics").exists())

	def test_only_course_staff_can_build_quizzes(self):
		self.assertEqual(
			self.foreign_instructor.post("/api/quizzes/build/", self.payload(self.world.l1.id), format="json").status_code,
			403,
		)
		self.assertEqual(
			self.student.post("/api/quizzes/build/", self.payload(self.world.l1.id), format="json").status_code,
			403,
		)


class QuestionnaireApiTests(TestCase):
	def setUp(self):
		self.world = World()
		self.instructor = APIClient()
		self.instructor.force_authenticate(user=self.world.instructor_a)
		self.foreign_instructor = APIClient()
		self.foreign_instructor.force_authenticate(user=self.world.instructor_b)
		self.student = APIClient()
		self.student.force_authenticate(user=self.world.student_1)
		created = self.instructor.post("/api/activities/", {
			"lesson": self.world.l1.id,
			"activity_type": "questionnaire",
			"title": "Course feedback",
			"is_required": True,
			"questionnaire_questions": [
				{
					"text": "How would you rate this lesson?",
					"question_type": "single_choice",
					"options": ["Excellent", "Good", "Needs work"],
					"required": True,
				},
				{
					"text": "What should we improve?",
					"question_type": "text",
					"options": [],
					"required": False,
				},
			],
		}, format="json")
		self.assertEqual(created.status_code, 201, created.data)
		self.activity_id = created.data["id"]

	def test_students_can_submit_update_and_instructors_can_review_responses(self):
		activity = self.student.get(f"/api/activities/{self.activity_id}/")
		self.assertEqual(activity.status_code, 200, activity.data)
		self.assertEqual(len(activity.data["questionnaire_questions"]), 2)

		invalid = self.student.post(
			f"/api/questionnaires/{self.activity_id}/response/",
			{"answers": {"0": 99}},
			format="json",
		)
		self.assertEqual(invalid.status_code, 400, invalid.data)

		submitted = self.student.post(
			f"/api/questionnaires/{self.activity_id}/response/",
			{"answers": {"0": 1}},
			format="json",
		)
		self.assertEqual(submitted.status_code, 200, submitted.data)
		self.assertEqual(submitted.data["answers"], {"0": 1, "1": ""})
		self.assertEqual(
			self.student.get(f"/api/activities/{self.activity_id}/").data["completion_status"],
			"completed",
		)

		updated = self.student.post(
			f"/api/questionnaires/{self.activity_id}/response/",
			{"answers": {"0": 2, "1": "More worked examples"}},
			format="json",
		)
		self.assertEqual(updated.status_code, 200, updated.data)
		responses = self.instructor.get(f"/api/questionnaires/{self.activity_id}/response/")
		self.assertEqual(responses.status_code, 200, responses.data)
		self.assertEqual(responses.data[0]["answers"]["1"], "More worked examples")
		self.assertEqual(
			self.foreign_instructor.get(f"/api/questionnaires/{self.activity_id}/response/").status_code,
			403,
		)

	def test_questionnaire_must_have_valid_response_questions(self):
		response = self.instructor.post("/api/activities/", {
			"lesson": self.world.l1.id,
			"activity_type": "questionnaire",
			"title": "Empty survey",
			"questionnaire_questions": [],
		}, format="json")
		self.assertEqual(response.status_code, 400, response.data)
