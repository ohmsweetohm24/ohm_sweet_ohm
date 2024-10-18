from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from flask import Flask
from ai_functions import scan_image, get_monthly_national_average, get_energy_saving_suggestions


app = Flask(__name__)
CORS(app)


@app.route('/api/scan', methods=['POST'])
def scan():
    if 'images' not in request.files:
        return jsonify({'error': 'No image files provided.'}), 400

    images = request.files.getlist('images')
    image_responses = []

    os.makedirs('temp', exist_ok=True)

    try:
        for image in images:
            image_path = os.path.join('temp', image.filename)
            image.save(image_path)

            reply = scan_image(image_path)
            # # below is for test
            # reply = {
            #     "appliance": "Kettle 1.5L",
            #     "power_usage": 0.1,
            #     "brand": "Meyer",
            #     "model": "MMEK1500D"
            # }

            image_responses.append(reply)

            os.remove(image_path)

        print(image_responses) # debug
        return jsonify(image_responses)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# NATIONAL_AVERAGE_CACHE with estimated monthly energy consumption (in kWh) for common appliances
NATIONAL_AVERAGE_CACHE = {
    "Kettle": 3.5,
    "Air Conditioner": 300,
    "Refrigerator": 108,
    "Washing Machine": 4,
    "Microwave Oven": 18,
    "Television": 12,
    "Water Heater": 45,
    "Fan": 18,
    "Laptop": 10.8,
    "Electric Oven": 30,
    "Iron": 7.5,
    "Hair Dryer": 4.5,
    "Vacuum Cleaner": 2.4
}

# Check if the appliance exists in the cache
def get_cached_national_average(appliance_name):
    for key in NATIONAL_AVERAGE_CACHE:
        if key.lower() in appliance_name.lower():
            return NATIONAL_AVERAGE_CACHE[key]
    return None

@app.route('/getNationalMonthlyAverage', methods=['POST'])
def getNationalMonthlyAverage():
    try:
        appliances_list = request.get_json()

        if not isinstance(appliances_list, list):
            return jsonify({'error': 'Input data should be a list of appliances.'}), 400

        # Add "monthlyNationalAverage" to each appliance in the list
        for appliance in appliances_list:
            appliance_name = appliance.get('appliance', 'Unidentified')
            
            # Check if the appliance is already in the cache
            national_average = get_cached_national_average(appliance_name)
            
            if national_average is None:
                # If not in the cache, call OpenAI API to get the estimate
                national_average = get_monthly_national_average(appliance_name)
                
                # Add the new appliance to the cache for future use
                NATIONAL_AVERAGE_CACHE[appliance_name] = national_average
            
            # Update the appliance data with the monthly national average
            appliance['monthlyNationalAverage'] = national_average

        return jsonify(appliances_list), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/getSuggestions', methods=['POST'])
def getSuggestions():
    try:
        appliances_list = request.get_json()

        if not isinstance(appliances_list, list):
            return jsonify({'error': 'Input data should be a list of appliances.'}), 400

        # Call the function to get suggestions from OpenAI API
        suggestions = get_energy_saving_suggestions(appliances_list)

        return jsonify(suggestions), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

app=app