# Database Schema Issue: Animal ID Mismatch

## Problem Description

The application is experiencing a database schema mismatch when trying to create visits for cattle. The error occurs because:

1. **Cattle API** returns animals with UUID string identifiers (e.g., `"edb411aa-8db2-48b8-8ed0-93d2e5b6509e"`)
2. **Visits table** expects an integer foreign key for the `animal` field
3. **PostgreSQL** throws a `DatatypeMismatch` error when trying to insert a UUID string into an integer column

## Error Details

```
psycopg2.errors.DatatypeMismatch: column "animal_id" is of type integer but expression is of type uuid
LINE 1: ...nimal_performance", "beneficiary_issues") VALUES ('edb411aa-...
                                                             ^
HINT:  You will need to rewrite or cast the expression.
```

## Solutions

### Option 1: Update Database Schema (Recommended)

Update the `sc_visits` table to use UUID for animal references:

```sql
-- 1. Add a new UUID column
ALTER TABLE sc_visits ADD COLUMN animal_uuid UUID;

-- 2. If you have existing data, you might need to migrate it
-- UPDATE sc_visits SET animal_uuid = (SELECT animal_id FROM cattle WHERE cattle.id = sc_visits.animal_id);

-- 3. Drop the old integer column
ALTER TABLE sc_visits DROP COLUMN animal_id;

-- 4. Rename the new column
ALTER TABLE sc_visits RENAME COLUMN animal_uuid TO animal_id;

-- 5. Add foreign key constraint
ALTER TABLE sc_visits ADD CONSTRAINT fk_animal_id 
    FOREIGN KEY (animal_id) REFERENCES milch_animals(animal_id);
```

### Option 2: Add ID Mapping in API

If you can't change the database schema, add a mapping layer in your Django API:

```python
# In your Django serializer or view
class SCVisitSerializer(serializers.ModelSerializer):
    animal = serializers.CharField()  # Accept UUID string
    
    def create(self, validated_data):
        animal_uuid = validated_data.pop('animal')
        
        # Find the integer ID from the UUID
        try:
            animal = MilchAnimal.objects.get(animal_id=animal_uuid)
            validated_data['animal_id'] = animal.id  # Use integer ID
        except MilchAnimal.DoesNotExist:
            raise serializers.ValidationError("Animal not found")
            
        return super().create(validated_data)
```

### Option 3: Frontend Workaround (Temporary)

The frontend now includes logic to:
1. Fetch cattle data and look for integer ID fields
2. Provide detailed error messages to users
3. Log complete data structures for debugging

## Current Frontend Implementation

The `AddVisitScreen` now:
- Fetches cattle data to find integer IDs
- Logs complete data structures for debugging
- Provides clear error messages about the schema issue
- Attempts multiple ID formats before failing

## Recommended Action

**Option 1** is the best long-term solution as it makes the database schema consistent. All animal references should use the same UUID format throughout the system.

## Files Modified

- `src/screens/cattle/AddVisitScreen.tsx` - Added error handling and ID detection
- `src/screens/cattle/CattleVisitScreen.tsx` - Updated navigation
- `src/navigation/types.ts` - Added AddVisit route
- `src/navigation/AppNavigator.tsx` - Added AddVisit screen
- `src/config/api.ts` - Added SC_VISITS endpoint

## Testing

To test the fix:
1. Try creating a visit through the app
2. Check the console logs for cattle data structure
3. The app will now provide clear error messages about the schema issue
4. Once the backend is fixed, the app should work seamlessly