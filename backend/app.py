import base64
import json
from stegano import lsb
from PIL import Image
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import datetime
import hashlib
import os

app = Flask(__name__)
CORS(app)
client = MongoClient('mongodb://localhost:27017/')
db = client['hacksheild']
collection = db['blocks']

UPLOAD_FOLDER = './uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return jsonify({'message': 'HackShield backend is live 🔐'}), 200

def generate_hash(data: dict):
    json_string = json.dumps(data, sort_keys=True)
    return hashlib.sha256(json_string.encode()).hexdigest()

@app.route('/encode', methods=['POST'])
def encode():
    try:
        image = request.files.get('image')
        recipient = request.form.get('recipient', '').strip()
        device_id = request.form.get('device_id', '').strip()
        secret = request.form.get('secret', '').strip()

        # ✅ Define timestamp here
        timestamp = datetime.datetime.utcnow().isoformat()

        # Now use it
        base_payload = {
            "recipient": recipient,
            "device_id": device_id,
            "secret": secret,
            "timestamp": timestamp
        }
        # Generate hash from base payload
        full_hash = generate_hash(base_payload)

        # Final payload to embed into image (includes the hash now)
        final_payload = base_payload.copy()
        final_payload["hash"] = full_hash

        # Convert final payload to JSON string
        payload_json = json.dumps(final_payload)

        # Open and encode image
        image_pil = Image.open(image.stream).convert("RGB")
        encoded_image = lsb.hide(image_pil, payload_json)

        # Save image to memory
        output = BytesIO()
        encoded_image.save(output, format='PNG')
        output.seek(0)
        encoded_bytes = output.getvalue()

        # Convert image to base64
        encoded_base64 = base64.b64encode(encoded_bytes).decode('utf-8')

        # Save hash + device_id to MongoDB
        collection.insert_one({
            "device_id": device_id,
            "recipient": recipient,
            "hash": full_hash,
            "timestamp": timestamp
        })

        return jsonify({
            'success': True,
            'image_base64': encoded_base64
        }), 200

    except Exception as e:
        print("🔥 Error:", e)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/decode', methods=['POST'])
def decode():
    try:
        image = request.files.get('image')
        device_id = request.form.get('device_id')

        if not image or not device_id:
            return jsonify({'success': False, 'message': 'Missing image or device ID'}), 400

        # Open the image
        image_pil = Image.open(image.stream).convert("RGB")

        # Decode hidden data from image using LSB
        hidden_data = lsb.reveal(image_pil)

        if not hidden_data:
            return jsonify({'success': False, 'message': 'No hidden data found in the image'}), 400

        # Parse the hidden JSON payload
        try:
            payload = json.loads(hidden_data)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid hidden data format'}), 400

        # Step 1: Extract the original hash
        original_hash = payload.get('hash')
        if not original_hash:
            return jsonify({'success': False, 'message': 'No hash found in the hidden message'}), 400

        # Step 2: Lookup the record by hash
        record = collection.find_one({"hash": original_hash})
        if not record:
            return jsonify({'success': False, 'message': 'Hash not found in database. Message may be invalid.'}), 400

        # Step 3: Validate device ID against stored recipient
        device_id_from_db = record.get("recipient")  # ✅ compare with recipient (target)
        if device_id_from_db != device_id:  # ✅ now this enforces only recipient can decode
            return jsonify({'success': False, 'message': '❌ This device is not authorized to decode this message'}), 403

        # Step 4: Verify hash integrity
        verify_payload = {
            "recipient": payload.get("recipient"),
            "device_id": payload.get("device_id"),
            "secret": payload.get("secret"),
            "timestamp": payload.get("timestamp")
        }

        calculated_hash = generate_hash(verify_payload)

        if calculated_hash != original_hash:
            return jsonify({'success': False, 'message': '⚠️ Message has been altered'}), 400

        # All checks passed, return the secret message
        return jsonify({'success': True, 'secret': payload.get('secret')}), 200

    except Exception as e:
        print("🔥 Decode Error:", e)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/blocks', methods=['GET'])
def get_blocks():
    try:
        blocks = list(collection.find({}, {"_id": 0}).sort("timestamp", -1))
        return jsonify({"success": True, "blocks": blocks}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
