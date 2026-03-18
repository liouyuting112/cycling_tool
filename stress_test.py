import requests
import json
import time
import random

# Configuration
TARGET_URL = "https://hidden-surf-0579.love7053150.workers.dev/"
API_KEY_HEADER = "X-RoadMaster-Auth" # This worker uses CORS checks, not this specific header usually, but I'll keep it for the proxy logic.
MOCK_TOKEN = "valid-frontend-token-123"

def test_request_burst(n=1000):
    print(f"--- Simulating {n} rapid requests ---")
    success = 0
    failure = 0
    for i in range(n):
        try:
            # Random coordinates within Taiwan bounds
            lat = random.uniform(22.0, 25.5)
            lng = random.uniform(120.0, 122.0)
            
            headers = {API_KEY_HEADER: MOCK_TOKEN}
            payload = {"lat": lat, "lng": lng, "type": "nearbySearch"}
            
            response = requests.post(TARGET_URL, json=payload, headers=headers, timeout=2)
            if response.status_code == 200:
                success += 1
            else:
                failure += 1
        except Exception as e:
            failure += 1
        
        if i % 100 == 0:
            print(f"Progress: {i}/{n}")
            
    print(f"Success: {success}, Failure: {failure}")

def test_injection_coordinates():
    print("--- Testing Coordinate Injection ---")
    extreme_coords = [
        {"lat": 999999, "lng": 0},
        {"lat": "NaN", "lng": "DROP TABLE users"},
        {"lat": -99, "lng": 181}
    ]
    for coord in extreme_coords:
        headers = {API_KEY_HEADER: MOCK_TOKEN}
        response = requests.post(TARGET_URL, json=coord, headers=headers)
        print(f"Coord {coord}: Status {response.status_code}")

def test_unauthorized_access():
    print("--- Testing Unauthorized Access ---")
    response = requests.post(TARGET_URL, json={"lat": 23.5, "lng": 121.0})
    print(f"No Token Status: {response.status_code} (Expected 401 or 403)")

if __name__ == "__main__":
    print("=== ROAD MASTER PRO STRESS TEST ===")
    # Note: These tests will fail if TARGET_URL is not a reachable proxy
    # In a real environment, replace TARGET_URL with your Cloudflare Worker / Lambda URL
    try:
        test_unauthorized_access()
        test_injection_coordinates()
        # test_request_burst(100) # Throttled for safety
    except Exception as e:
        print(f"Error connecting to target: {e}")
