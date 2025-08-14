# PROMPT FOR BACKEND AI

## Task: Create API Endpoint to Get Visits by Animal ID

I need you to create a new API endpoint in Django that returns all visits for a specific animal. Here are the requirements:

### Current Models:
```python
class SCVisit(models.Model):
    visit_id = models.AutoField(primary_key=True)
    animal = models.ForeignKey(MilchAnimal, on_delete=models.CASCADE)
    visit_number = models.PositiveSmallIntegerField()
    visit_date = models.DateField()
    animal_photo = models.TextField()
    health_status = models.TextField()
    line_of_treatment = models.TextField()
    vaccinations_given = models.CharField(max_length=255)
    pregnancy_period = models.PositiveSmallIntegerField(null=True, blank=True)
    calf_age = models.PositiveSmallIntegerField(null=True, blank=True)
    calf_gender = models.CharField(max_length=7, choices=CALF_GENDER_CHOICES)
    milk_yield = models.DecimalField(max_digits=5, decimal_places=2)
    animal_performance = models.TextField()
    beneficiary_issues = models.TextField()
```

### Required API Endpoint:
- **URL**: `/api/sc-visits/by-animal/{animal_id}/`
- **Method**: GET
- **Purpose**: Get all visits for a specific animal using the animal's UUID (animal_id field)

### Expected Response Format:
```json
{
  "count": 2,
  "animal_id": "c31fde88-1234-5678-9abc-def123456789",
  "results": [
    {
      "visit_id": 1,
      "animal": "c31fde88-1234-5678-9abc-def123456789",
      "visit_number": 1,
      "visit_date": "2025-08-13",
      "health_status": "Good health",
      "line_of_treatment": "Regular checkup",
      "vaccinations_given": "FMD vaccine",
      "pregnancy_period": null,
      "calf_age": null,
      "calf_gender": "Male",
      "milk_yield": "15.75",
      "animal_performance": "Excellent",
      "beneficiary_issues": "None",
      "animal_photo": "path/to/photo.jpg"
    }
  ]
}
```

### Requirements:
1. Use Django REST Framework ViewSet with custom action
2. Filter visits by animal using the animal's UUID (animal_id field from MilchAnimal model)
3. Order results by visit_date (newest first) and then by visit_number
4. Handle errors gracefully (animal not found, etc.)
5. Return proper HTTP status codes

### Implementation Notes:
- The animal parameter will be a UUID string like "c31fde88-1234-5678-9abc-def123456789"
- You need to find the MilchAnimal by its animal_id field (not the primary key)
- Then filter SCVisit records by that MilchAnimal instance
- Include error handling for when animal is not found

Please implement this API endpoint and update the URL routing accordingly.