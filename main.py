from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn

# Apne video chat module ko import karein
from video_chat_module import router as video_chat_router

# Apna main FastAPI app banayein
app = FastAPI()

# --- Video Module Ko Jodein ---
# Apne video router ko main app mein include karein
app.include_router(video_chat_router)

# Video module ke liye static files (CSS, JS) ko mount karein
app.mount("/static", StaticFiles(directory="static"), name="static")


# --- Aapke Main Project ke Doosre Routes ---
# Yahaan aap apne main project ke baaki routes (jaise login, dashboard) bana sakte hain

@app.get("/dashboard")
async def get_dashboard():
    return {"message": "Welcome to your main project's dashboard!"}

@app.get("/login")
async def get_login():
    return {"message": "This is your main login page."}

# --- Server Run Karein ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
