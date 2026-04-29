import asyncio
from app.core.errors import InternalError

err = InternalError("some error")
print(err.to_dict(request_id="abc"))
