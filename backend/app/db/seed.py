from app.db.session import SessionLocal
from app.db.models import Violation, Evidence, Camera, TrafficRule, PoliceStation, InterStationAlert, StationDispatchMessage
import datetime

def seed_db():
    db = SessionLocal()
    try:
        # Seed Cameras if empty
        if not db.query(Camera).first():
            demo_cam = Camera(
                id="DEMO-CAM-01", 
                name="Hyderabad Junction", 
                camera_type="DEMO", 
                lat=17.3850, 
                lng=78.4867
            )
            db.add(demo_cam)
            db.commit()
            
            # Insert sample violations with locations
            samples = [
                Violation(violation_type="NO_HELMET", confidence=0.92, plate_number="TS09AB1234", plate_confidence=0.88, status="PENDING", camera_id="DEMO-CAM-01", lat=17.3850, lng=78.4867),
                Violation(violation_type="TRIPLE_RIDING", confidence=0.85, plate_number="MH12CD5678", plate_confidence=0.75, status="VERIFIED", camera_id="DEMO-CAM-01", lat=17.3860, lng=78.4870),
                Violation(violation_type="RED_LIGHT", confidence=0.98, plate_number="KA01EF9012", plate_confidence=0.91, status="UNDER_REVIEW", camera_id="DEMO-CAM-01", lat=17.3840, lng=78.4860),
                Violation(violation_type="NO_HELMET", confidence=0.60, plate_number=None, plate_confidence=None, status="REJECTED", camera_id="DEMO-CAM-01", lat=17.3855, lng=78.4855),
            ]
            db.add_all(samples)
            db.commit()
            
            for v in samples:
                ev = Evidence(violation_id=v.id, image_path="/storage/mock_placeholder.jpg")
                db.add(ev)
            db.commit()

        # Seed Indian traffic rule library with realistic examples.
        default_rules = [
            {
                "code": "HLM01",
                "title": "Riding without helmet",
                "description": "Two-wheeler riders and pillion riders must wear ISI-certified helmets as per the Motor Vehicles Act. This is a common and high-risk safety violation.",
                "category": "Safety",
                "section": "MV Act, Section 129",
                "penalty": "₹1,000 and/or licence suspension",
                "challan_amount": "₹1,000",
            },
            {
                "code": "SPD02",
                "title": "Speeding beyond legal limit",
                "description": "Driving above the prescribed speed limit on highways or urban roads endangers pedestrians, cyclists, and other vehicles.",
                "category": "Speeding",
                "section": "MV Act, Section 183",
                "penalty": "₹2,000 to ₹4,000 and possible licence action",
                "challan_amount": "₹2,000–₹4,000",
            },
            {
                "code": "RED01",
                "title": "Red light jumping",
                "description": "Crossing a traffic signal when it is red is a serious violation that increases collision risk at intersections.",
                "category": "Signal Violation",
                "section": "MV Act, Section 184",
                "penalty": "₹1,000 to ₹5,000",
                "challan_amount": "₹1,000–₹5,000",
            },
            {
                "code": "TRP01",
                "title": "Triple riding",
                "description": "More than one rider on a two-wheeler is prohibited unless the vehicle is designed for it, and it is a high-risk safety offense.",
                "category": "Safety",
                "section": "MV Act, Section 194",
                "penalty": "₹1,000 and licence suspension",
                "challan_amount": "₹1,000",
            },
            {
                "code": "MOB02",
                "title": "Using mobile phone while driving",
                "description": "Talking on a handheld mobile phone or using it for messaging while driving is not allowed in most urban and highway conditions.",
                "category": "Distracted Driving",
                "section": "MV Act, Section 177 / 184",
                "penalty": "₹1,000 to ₹5,000",
                "challan_amount": "₹1,000–₹5,000",
            },
            {
                "code": "DRK01",
                "title": "Driving under influence",
                "description": "Driving with alcohol or intoxication beyond legal limits can endanger life and leads to severe criminal and traffic penalties.",
                "category": "Dangerous Driving",
                "section": "MV Act, Section 185",
                "penalty": "₹10,000 and/or imprisonment and licence cancellation",
                "challan_amount": "₹10,000+",
            },
            {
                "code": "WRG01",
                "title": "Driving in wrong direction",
                "description": "Driving against the designated traffic flow on one-way or restricted roads can cause severe accidents.",
                "category": "Reckless Driving",
                "section": "MV Act, Section 184",
                "penalty": "₹500 to ₹1,500",
                "challan_amount": "₹500–₹1,500",
            },
            {
                "code": "BEL01",
                "title": "Seat belt violation",
                "description": "Front seat occupants must wear seat belts, and this rule helps reduce fatal injuries in collisions.",
                "category": "Safety",
                "section": "MV Act, Section 138",
                "penalty": "₹1,000",
                "challan_amount": "₹1,000",
            },
        ]

        existing_rules = db.query(TrafficRule).count()
        if existing_rules == 0:
            for item in default_rules:
                db.add(TrafficRule(**item))
            db.commit()

        # Seed Inter-Station Police Network
        existing_stations = db.query(PoliceStation).count()
        if existing_stations == 0:
            stations = [
                PoliceStation(
                    id="PS-HQ",
                    name="Central Police Command & Control HQ",
                    zone="Central Grid",
                    jurisdiction="Metropolitan Traffic Surveillance & Inter-Station Coordination",
                    contact_number="+91 40 2785 2435",
                    duty_officer="Joint Commissioner R. K. Verma",
                    lat=17.4065,
                    lng=78.4772,
                    status="ONLINE",
                    active_checkpoints=6
                ),
                PoliceStation(
                    id="PS-BANJARA",
                    name="Banjara Hills Traffic Police Station",
                    zone="West Zone",
                    jurisdiction="Road No. 1 to 14, KBR Park Perimeter, Taj Krishna Junction",
                    contact_number="+91 40 2335 1100",
                    duty_officer="Inspector K. Vijay Kumar",
                    lat=17.4156,
                    lng=78.4350,
                    status="PATROL_ALERT",
                    active_checkpoints=4
                ),
                PoliceStation(
                    id="PS-JUBILEE",
                    name="Jubilee Hills Traffic Police Station",
                    zone="West Zone",
                    jurisdiction="Road No. 36 & 45, Durgam Cheruvu Connector, Checkpost Circle",
                    contact_number="+91 40 2355 2200",
                    duty_officer="Sub-Inspector M. Sharma",
                    lat=17.4319,
                    lng=78.4073,
                    status="ONLINE",
                    active_checkpoints=5
                ),
                PoliceStation(
                    id="PS-CYBER",
                    name="Cyberabad IT Corridor Traffic Station",
                    zone="IT Corridor",
                    jurisdiction="Hitec City, Mindspace Junction, Bio-Diversity Flyover, Gachibowli",
                    contact_number="+91 40 2311 3300",
                    duty_officer="ACP Ananya Reddy",
                    lat=17.4435,
                    lng=78.3772,
                    status="HIGH_ALERT",
                    active_checkpoints=7
                ),
                PoliceStation(
                    id="PS-SECUNDER",
                    name="Secunderabad North Traffic Police Station",
                    zone="North Zone",
                    jurisdiction="Clock Tower, Paradise Circle, MG Road, Cantonment Gate",
                    contact_number="+91 40 2780 4400",
                    duty_officer="Inspector Suresh Naik",
                    lat=17.4411,
                    lng=78.4983,
                    status="ONLINE",
                    active_checkpoints=3
                ),
                PoliceStation(
                    id="PS-CHARMINAR",
                    name="Charminar Old City Traffic Police Station",
                    zone="South Zone",
                    jurisdiction="Historic Core, Madina Circle, Nayapul Bridge, Falaknuma Route",
                    contact_number="+91 40 2452 5500",
                    duty_officer="Sub-Inspector Rizwan Ali",
                    lat=17.3616,
                    lng=78.4747,
                    status="ONLINE",
                    active_checkpoints=4
                )
            ]
            db.add_all(stations)
            db.commit()

            # Seed realistic active inter-station alerts
            alerts = [
                InterStationAlert(
                    source_station_id="PS-BANJARA",
                    target_station_id="PS-JUBILEE",
                    alert_type="INTERCEPT_DEFAULTER",
                    priority="CRITICAL",
                    plate_number="TS09AB1234",
                    vehicle_type="FOUR_WHEELER",
                    total_unpaid_amount="₹6,000",
                    unpaid_challans_count=4,
                    last_seen_junction="KBR Park South Gate Cam #3",
                    heading_direction="Heading Westbound towards Jubilee Hills Rd #36",
                    speed_recorded=88.5,
                    notes="Repeated signal jumper with 4 unpaid challans. Fleeing checkpoint. Intercept at Jubilee Checkpost.",
                    status="ACTIVE"
                ),
                InterStationAlert(
                    source_station_id="PS-CYBER",
                    target_station_id="PS-JUBILEE",
                    alert_type="HIGH_SPEED_HAZARD",
                    priority="HIGH",
                    plate_number="MH12CD5678",
                    vehicle_type="TWO_WHEELER",
                    total_unpaid_amount="₹4,500",
                    unpaid_challans_count=3,
                    last_seen_junction="Durgam Cheruvu Cable Bridge",
                    heading_direction="Towards Jubilee Hills Sector border",
                    speed_recorded=102.0,
                    notes="Reckless triple riding & high-speed lane splitting. Alert checkpoint units.",
                    status="ACTIVE"
                ),
                InterStationAlert(
                    source_station_id="PS-SECUNDER",
                    target_station_id="PS-BANJARA",
                    alert_type="REPEAT_OFFENDER",
                    priority="MEDIUM",
                    plate_number="KA01EF9012",
                    vehicle_type="FOUR_WHEELER",
                    total_unpaid_amount="₹5,000",
                    unpaid_challans_count=3,
                    last_seen_junction="Begumpet Flyover Exit Cam #2",
                    heading_direction="Entering Banjara Hills Road #1",
                    speed_recorded=65.0,
                    notes="Tinted glass violation & 3 pending speeding challans. Screen at intersection.",
                    status="ACTIVE"
                ),
                InterStationAlert(
                    source_station_id="PS-CHARMINAR",
                    target_station_id="PS-HQ",
                    alert_type="GREEN_CORRIDOR",
                    priority="CRITICAL",
                    plate_number="EMERGENCY-AMB-108",
                    vehicle_type="EMERGENCY_AMBULANCE",
                    total_unpaid_amount="₹0",
                    unpaid_challans_count=0,
                    last_seen_junction="Afzalgunj Hospital Route",
                    heading_direction="Inbound to NIMS Punjagutta through Banjara Sector",
                    speed_recorded=74.0,
                    notes="Critical organ transport. Clear all cross-junction signals immediately.",
                    status="ACTIVE"
                )
            ]
            db.add_all(alerts)
            db.commit()

            # Seed realistic dispatch comms
            dispatches = [
                StationDispatchMessage(
                    from_station_id="PS-BANJARA",
                    to_station_id="PS-JUBILEE",
                    sender_name="Inspector K. Vijay Kumar",
                    message_type="ALERT",
                    content="🚨 URGENT: Black SUV TS09AB1234 skipped halt signal at KBR Junction. 4 unpaid challans totaling ₹6,000. Moving fast towards your Checkpost!",
                    attached_plate="TS09AB1234"
                ),
                StationDispatchMessage(
                    from_station_id="PS-JUBILEE",
                    to_station_id="PS-BANJARA",
                    sender_name="Sub-Inspector M. Sharma",
                    message_type="DISPATCH",
                    content="Copy that Banjara desk. Checkpoint Unit 2 is positioned with spike barrier standby at Road 36. Will intercept and collect dues.",
                    attached_plate="TS09AB1234"
                ),
                StationDispatchMessage(
                    from_station_id="PS-HQ",
                    to_station_id="ALL",
                    sender_name="Central Dispatch HQ",
                    message_type="GENERAL",
                    content="📢 ALL STATIONS: Coordinated special drive for cross-jurisdiction unpaid challan collection is now active across all sector checkpoints.",
                )
            ]
            db.add_all(dispatches)
            db.commit()
        
        print("Database seeded with sample data and police stations.")
    except Exception as e:
        print(f"Failed to seed DB: {e}")
    finally:
        db.close()
