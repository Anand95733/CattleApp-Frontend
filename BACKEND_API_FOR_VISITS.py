# DJANGO BACKEND: API ENDPOINT TO GET VISITS BY ANIMAL ID
# 
# Add this to your Django views.py or create a new views file

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import SCVisit, MilchAnimal
from .serializers import SCVisitSerializer

class SCVisitViewSet(viewsets.ModelViewSet):
    queryset = SCVisit.objects.all()
    serializer_class = SCVisitSerializer
    
    @action(detail=False, methods=['get'], url_path='by-animal/(?P<animal_id>[^/.]+)')
    def by_animal(self, request, animal_id=None):
        """
        Get all visits for a specific animal by animal_id (UUID)
        URL: /api/sc-visits/by-animal/{animal_id}/
        """
        try:
            # Find the animal by UUID
            animal = get_object_or_404(MilchAnimal, animal_id=animal_id)
            
            # Get all visits for this animal, ordered by visit_date (newest first)
            visits = SCVisit.objects.filter(animal=animal).order_by('-visit_date', '-visit_number')
            
            # Serialize the visits
            serializer = self.get_serializer(visits, many=True)
            
            return Response({
                'count': visits.count(),
                'animal_id': animal_id,
                'animal_info': {
                    'animal_id': animal.animal_id,
                    'beneficiary': getattr(animal, 'beneficiary', 'Unknown'),
                    'breed': getattr(animal, 'breed', 'Unknown'),
                },
                'results': serializer.data
            })
            
        except MilchAnimal.DoesNotExist:
            return Response(
                {'error': f'Animal with ID {animal_id} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch visits: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ALTERNATIVE: If you prefer a simple function-based view
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def get_visits_by_animal(request, animal_id):
    """
    Get all visits for a specific animal
    URL: /api/visits-by-animal/{animal_id}/
    """
    try:
        # Find the animal
        animal = get_object_or_404(MilchAnimal, animal_id=animal_id)
        
        # Get visits for this animal
        visits = SCVisit.objects.filter(animal=animal).order_by('-visit_date', '-visit_number')
        
        # Serialize visits
        serializer = SCVisitSerializer(visits, many=True)
        
        return Response({
            'count': visits.count(),
            'animal_id': animal_id,
            'results': serializer.data
        })
        
    except MilchAnimal.DoesNotExist:
        return Response(
            {'error': f'Animal with ID {animal_id} not found'}, 
            status=404
        )

# ADD TO YOUR urls.py:

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sc-visits', views.SCVisitViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    
    # Alternative function-based view URL
    path('api/visits-by-animal/<str:animal_id>/', views.get_visits_by_animal, name='visits-by-animal'),
]

# ENHANCED SERIALIZER (Update your existing SCVisitSerializer):

class SCVisitSerializer(serializers.ModelSerializer):
    animal = serializers.CharField(write_only=True)
    animal_info = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = SCVisit
        fields = '__all__'
    
    def get_animal_info(self, obj):
        """Include animal information in the response"""
        if obj.animal:
            return {
                'animal_id': obj.animal.animal_id,
                'beneficiary': getattr(obj.animal, 'beneficiary', 'Unknown'),
                'breed': getattr(obj.animal, 'breed', 'Unknown'),
                'type': getattr(obj.animal, 'type', 'Unknown'),
            }
        return None
    
    def create(self, validated_data):
        animal_uuid = validated_data.pop('animal')
        try:
            animal_instance = MilchAnimal.objects.get(animal_id=animal_uuid)
            validated_data['animal'] = animal_instance
        except MilchAnimal.DoesNotExist:
            raise serializers.ValidationError(f"Animal with ID {animal_uuid} not found")
        return super().create(validated_data)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Include animal_id in the response for frontend use
        if instance.animal:
            data['animal'] = instance.animal.animal_id
        return data

# TEST THE API:
# After implementing, test with:
# GET /api/sc-visits/by-animal/{your-animal-uuid}/
# 
# Expected response:
# {
#   "count": 1,
#   "animal_id": "your-animal-uuid",
#   "animal_info": {
#     "animal_id": "your-animal-uuid",
#     "beneficiary": "John Doe",
#     "breed": "Holstein"
#   },
#   "results": [
#     {
#       "visit_id": 1,
#       "animal": "your-animal-uuid",
#       "visit_number": 1,
#       "visit_date": "2025-08-13",
#       "health_status": "Good",
#       "milk_yield": "15.75",
#       ...
#     }
#   ]
# }
