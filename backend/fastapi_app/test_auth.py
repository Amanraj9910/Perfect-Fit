
import asyncio
from dependencies import verify_admin
from fastapi import Header

# This is tricky as verify_admin expects a Header object which is a FastAPI dependency.
# But we can check the code or just verify the return value in a test env.

async def test_verify():
    import sys
    from unittest.mock import MagicMock
    
    # Mock supabase auth
    import dependencies
    dependencies.supabase.auth.get_user = MagicMock()
    
    mock_user = MagicMock()
    mock_user.id = "test-uuid"
    
    class MockResp:
        def __init__(self, user):
            self.user = user
            
    # Mocking get_user response
    async def mock_get_user(token):
        return MockResp(mock_user)
        
    dependencies.supabase.auth.get_user = mock_get_user
    
    # Mocking profiles check
    async def mock_execute():
        class MockData:
            def __init__(self):
                self.data = {"role": "admin"}
        return MockData()
        
    mock_table = MagicMock()
    mock_table.select.return_value.eq.return_value.single.return_value.execute = mock_execute
    dependencies.supabase.table = MagicMock(return_value=mock_table)
    
    # Call verify_admin
    result = await dependencies.verify_admin("test-token")
    print(f"Result type: {type(result)}")
    try:
        print(f"Result['id']: {result['id']}")
    except TypeError as e:
        print(f"TypeError on result['id']: {e}")
    except Exception as e:
        print(f"Other error on result['id']: {e}")
        
    print(f"Result.id: {result.id}")

if __name__ == "__main__":
    asyncio.run(test_verify())
