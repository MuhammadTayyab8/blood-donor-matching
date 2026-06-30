import uvicorn

def main():
    print("Starting RedLine AI Blood Dispatcher Backend...")
    uvicorn.run("app.fast_api_app:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
