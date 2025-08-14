# DJANGO BACKEND FIX FOR SC_VISITS DATABASE ISSUE
# 
# The problem: Your SCVisit model has a ForeignKey to MilchAnimal, but the database
# column "animal_id" is of type integer while you're trying to insert UUID strings.
#
# SOLUTION 1: Fix the Django Serializer (RECOMMENDED - QUICK FIX)
# Add this to your Django views.py or serializers.py:

from rest_framework import serializers
from .models import SCVisit, MilchAnimal

class SCVisitSerializer(serializers.ModelSerializer):
    # Accept animal as a string (UUID) but convert to the correct model instance
    animal = serializers.CharField(write_only=True)
    
    class Meta:
        model = SCVisit
        fields = '__all__'
    
    def create(self, validated_data):
        # Extract the animal UUID string
        animal_uuid = validated_data.pop('animal')
        
        try:
            # Find the MilchAnimal by its animal_id (UUID field)
            animal_instance = MilchAnimal.objects.get(animal_id=animal_uuid)
            # Set the actual model instance for the ForeignKey
            validated_data['animal'] = animal_instance
        except MilchAnimal.DoesNotExist:
            raise serializers.ValidationError(f"Animal with ID {animal_uuid} not found")
        
        return super().create(validated_data)
    
    def to_representation(self, instance):
        # When returning data, show the animal_id (UUID) instead of the integer pk
        data = super().to_representation(instance)
        if instance.animal:
            data['animal'] = instance.animal.animal_id  # Return UUID instead of integer
        return data

# SOLUTION 2: Database Migration (LONG-TERM FIX)
# If you want to fix the database schema properly, run these Django commands:

"""
# Create a migration to change the animal_id column type
python manage.py makemigrations --empty your_app_name

# Then edit the migration file to include:

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('your_app_name', '0001_initial'),  # Replace with your last migration
    ]

    operations = [
        # First, drop the foreign key constraint
        migrations.RunSQL(
            "ALTER TABLE sc_visits DROP CONSTRAINT IF EXISTS sc_visits_animal_id_fkey;",
            reverse_sql="-- No reverse"
        ),
        
        # Change the column type from integer to UUID
        migrations.RunSQL(
            "ALTER TABLE sc_visits ALTER COLUMN animal_id TYPE UUID USING animal_id::text::uuid;",
            reverse_sql="ALTER TABLE sc_visits ALTER COLUMN animal_id TYPE INTEGER;"
        ),
        
        # Re-add the foreign key constraint
        migrations.RunSQL(
            "ALTER TABLE sc_visits ADD CONSTRAINT sc_visits_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES milch_animals(animal_id);",
            reverse_sql="ALTER TABLE sc_visits DROP CONSTRAINT sc_visits_animal_id_fkey;"
        ),
    ]

# Then run: python manage.py migrate
"""

# SOLUTION 3: Update your Django ViewSet (if using ViewSets)
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status

class SCVisitViewSet(viewsets.ModelViewSet):
    queryset = SCVisit.objects.all()
    serializer_class = SCVisitSerializer
    
    def create(self, request, *args, **kwargs):
        # Log the incoming data for debugging
        print("Incoming visit data:", request.data)
        
        # Use the custom serializer that handles UUID to model instance conversion
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

# QUICK TEST: Add this to your Django shell to test the fix
"""
python manage.py shell

from your_app.models import MilchAnimal, SCVisit
from your_app.serializers import SCVisitSerializer

# Test data
test_data = {
    'animal': 'your-uuid-here',  # Replace with actual UUID
    'visit_number': 1,
    'visit_date': '2025-08-13',
    'animal_photo': 'test.jpg',
    'health_status': 'Good',
    'line_of_treatment': 'Regular checkup',
    'vaccinations_given': 'FMD',
    'calf_gender': 'Male',
    'milk_yield': '10.50',
    'animal_performance': 'Excellent',
    'beneficiary_issues': 'None'
}

serializer = SCVisitSerializer(data=test_data)
if serializer.is_valid():
    visit = serializer.save()
    print("Visit created successfully:", visit.visit_id)
else:
    print("Validation errors:", serializer.errors)
"""