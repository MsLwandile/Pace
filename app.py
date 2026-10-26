
import os
from flask import Flask
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ["FLASK_SECRET_KEY"]

supabase_url = os.environ["SUPABASE_URL"]
supabase_key = os.environ["SUPABASE_PUBLISHABLE_KEY"]

print("URL loaded:", bool(supabase_url))
print("Key loaded:", bool(supabase_key))
print("Key prefix:", supabase_key[:15] if supabase_key else "MISSING")

supabase: Client = create_client(
    supabase_url,
    supabase_key
)

@app.route("/")
def home():
    return "Flask is running and Supabase is configured."

if __name__ == "__main__":
    app.run(debug=True)
