"""
NetLab - Knowledge Base Seeder
Seeds ChromaDB with router/network knowledge for RAG.
Run once: python seed_knowledge.py
Optionally uses Gemini API to expand knowledge.
"""

import chromadb
from chromadb.utils import embedding_functions
import json, os, sys

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

# ─── Core Knowledge Base ──────────────────────────────────
# Curated knowledge about Malaysian ISPs, routers, common issues
KNOWLEDGE_BASE = [
    # PPPoE / WAN
    {
        "id": "pppoe_001",
        "text": """PPPoE (Point-to-Point Protocol over Ethernet) disconnection is the most common issue for Malaysian Unifi and Maxis fiber users.
Symptoms: internet drops, router shows WAN disconnected, logs show LCP timeout or PPPoE session terminated.
Common causes: (1) incorrect PPPoE username/password, (2) ONT/modem fault, (3) Unifi line instability, (4) MTU mismatch (should be 1492 for PPPoE).
Fix: restart ONT and router, verify PPPoE credentials in router settings, check fiber cable, call Unifi 1300-88-1221.""",
        "meta": {"category": "pppoe", "isp": "unifi,maxis", "severity": "warning"},
    },
    {
        "id": "pppoe_002",
        "text": """Unifi HyperFibre and standard fiber connections use PPPoE authentication.
Username format: usually [phone_number]@unifi or [account]@streamyx.
MTU should be set to 1492 on router WAN settings for PPPoE to work correctly.
If PPPoE keeps dropping: check if ONT has green light (solid = OK, blinking = syncing, red = fault).
LCP timeout in logs means the PPPoE server stopped responding — usually ISP-side issue.""",
        "meta": {"category": "pppoe", "isp": "unifi", "severity": "warning"},
    },
    # DNS
    {
        "id": "dns_001",
        "text": """DNS resolution failures cause websites to not load even when internet connection is active.
Symptoms: can ping 8.8.8.8 but cannot open google.com, NXDOMAIN errors in logs.
Unifi default DNS: 210.186.1.1 and 210.186.1.2 (sometimes unreliable).
Fix: change DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8, 8.8.4.4) in router DHCP settings.
Command to test: ping 8.8.8.8 (if works but website fails = DNS issue).""",
        "meta": {"category": "dns", "isp": "unifi,maxis,time", "severity": "warning"},
    },
    # Security
    {
        "id": "security_001",
        "text": """Brute force attacks target router admin panels and SSH ports.
Signs in logs: repeated failed login attempts from same IP, SYN flood warnings, port scan detected.
Immediate actions: (1) change router admin password, (2) disable remote management if enabled, (3) enable firewall, (4) block attacker IP.
Malaysian ISPs: report DDoS attacks to your ISP — Unifi has abuse team at abuse@tm.com.my.
Common attack source IPs: often from China (1.x.x.x, 112.x.x.x), Russia (5.x.x.x), or Eastern Europe.""",
        "meta": {"category": "security", "severity": "critical"},
    },
    {
        "id": "security_002",
        "text": """SYN flood attacks overwhelm routers by sending massive numbers of connection requests.
Symptoms: internet slows to a crawl, router CPU spikes, log shows thousands of SYN packets from single IP.
Fix: enable SYN flood protection in router firewall settings (most modern routers have this).
TP-Link Archer: Advanced → Security → DoS Protection → Enable.
ASUS: Adaptive QoS → Traffic Monitor or Firewall settings.
MikroTik: /ip firewall filter add chain=input protocol=tcp connection-state=new limit=50/1s,100 action=drop.""",
        "meta": {"category": "security", "severity": "critical"},
    },
    # WiFi / Signal
    {
        "id": "wifi_001",
        "text": """WiFi signal strength (RSSI) guide for Malaysian home networks:
Excellent: -30 to -50 dBm (next to router)
Good: -50 to -67 dBm (most devices work well)
Fair: -67 to -70 dBm (streaming may buffer)
Poor: -70 to -80 dBm (basic browsing only)
Very Poor: below -80 dBm (frequent disconnects)
Fix for weak signal: move router to central location, use 5GHz band for nearby devices, 2.4GHz for far devices.""",
        "meta": {"category": "wifi", "severity": "warning"},
    },
    {
        "id": "wifi_002",
        "text": """Malaysian WiFi channel interference: Malaysia uses 2.4GHz (channels 1-13) and 5GHz bands.
2.4GHz is overcrowded in apartments and condos — neighbors' routers cause interference.
Best channels for 2.4GHz: 1, 6, or 11 (non-overlapping). Never use auto in dense areas.
5GHz channels: 36, 40, 44, 48 (lower power), 149-165 (higher power, better for Malaysia).
TP-Link, ASUS, UniFi all support channel selection in wireless settings.""",
        "meta": {"category": "wifi", "severity": "info"},
    },
    # Hardware
    {
        "id": "hardware_001",
        "text": """Router overheating is common in Malaysia due to hot, humid climate.
Safe operating temperature: most routers rated for 0-40°C ambient.
Symptoms: random reboots, slow speeds, log shows thermal warnings.
Fix: place router in open, well-ventilated area. Never put in cabinet or closed shelf.
TP-Link Archer and ASUS routers have temperature monitoring in system logs.
If overheating persists after ventilation fix: router may be failing, contact retailer.""",
        "meta": {"category": "hardware", "severity": "warning"},
    },
    # Router-specific
    {
        "id": "tplink_001",
        "text": """TP-Link Archer series (AX, BE, C series) common issues in Malaysia:
1. Log location: Advanced → System → System Log
2. PPPoE settings: Internet → WAN → PPPoE, MTU=1492
3. Firmware update: fixes many stability issues, check tplinkmobi.com
4. Factory reset: hold reset button 10 seconds
5. TP-Link Tether app: can manage router from phone
6. Common Archer issue: 5GHz drops — update firmware or disable MU-MIMO temporarily""",
        "meta": {"category": "router", "brand": "tplink", "severity": "info"},
    },
    {
        "id": "asus_001",
        "text": """ASUS RT and ZenWiFi series common issues in Malaysia:
1. Log location: Administration → System Log → General Log
2. ASUS Merlin firmware: third-party firmware with more features, stable for most models
3. AI Protection (powered by Trend Micro): free built-in security, enable it
4. WAN settings: Connection type = PPPoE, MTU = 1492 for Unifi/Maxis
5. Common ASUS issue: WAN disconnects — check USB modem priority settings if using USB backup
6. ASUSWRT mobile app for remote management""",
        "meta": {"category": "router", "brand": "asus", "severity": "info"},
    },
    {
        "id": "mikrotik_001",
        "text": """MikroTik RouterOS common configurations for Malaysian networks:
1. Log location: Winbox → Log, or /log print in terminal
2. PPPoE client setup: /interface pppoe-client add name=pppoe-out1 interface=ether1 user=xxx password=xxx
3. DNS: /ip dns set servers=1.1.1.1,8.8.8.8
4. Firewall basics: /ip firewall filter add chain=input connection-state=invalid action=drop
5. MikroTik is common in small businesses and warung cyber in Malaysia
6. Default login: admin / (blank password) — CHANGE IMMEDIATELY""",
        "meta": {"category": "router", "brand": "mikrotik", "severity": "info"},
    },
    # ISP-specific
    {
        "id": "unifi_001",
        "text": """TM Unifi Malaysia troubleshooting guide:
Plans: 100Mbps, 300Mbps, 500Mbps, 1Gbps, 2.5Gbps (HyperFibre)
ONT types: Huawei HG8245H, Nokia G-010G-P (common in 2024)
PPPoE credentials: found on Unifi welcome letter or myunifi app
Self-service: MyUnifi app can restart ONT remotely
Fault report: 1300-88-1221 or unifi.com.my/selfcare
Common issues: PPPoE drops after 12AM (ISP maintenance window), DNS slow (use 1.1.1.1)
SLA: Unifi promises 99.9% uptime, compensation available for extended outages""",
        "meta": {"category": "isp", "isp": "unifi", "severity": "info"},
    },
    {
        "id": "maxis_001",
        "text": """Maxis Malaysia home fiber troubleshooting:
Plans: MaxisONE Home, Maxis Fibre (100-1000Mbps)
Router: Huawei B818 (4G backup), TP-Link or D-Link fiber routers
PPPoE: some Maxis plans use DHCP instead of PPPoE — check welcome letter
Fault report: 1800-82-1123 or Maxis app
MyMaxis app: check data usage, report faults, chat support
Common issues: Maxis 4G backup router (B818) has GPS antenna issues, place near window""",
        "meta": {"category": "isp", "isp": "maxis", "severity": "info"},
    },
    {
        "id": "time_001",
        "text": """Time dotCom Malaysia fiber troubleshooting:
Plans: 100Mbps to 10Gbps (fastest consumer speeds in Malaysia)
Coverage: primarily Klang Valley, Penang, Johor Bahru
PPPoE credentials: on Time welcome kit
Fault report: 1800-18-1818 or Time app
Time is known for competitive pricing and good speeds in covered areas
Router: Time provides own router (TP-Link or similar), PPPoE preset""",
        "meta": {"category": "isp", "isp": "time", "severity": "info"},
    },
]

def seed(gemini_expand: bool = False):
    print(f"[NetLab] Seeding knowledge base at {CHROMA_PATH}...")

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(
        name="netlab_knowledge",
        embedding_function=ef,
    )

    # Check existing
    existing_ids = set()
    try:
        existing = collection.get()
        existing_ids = set(existing["ids"])
    except Exception:
        pass

    # Add new entries
    new_docs = [k for k in KNOWLEDGE_BASE if k["id"] not in existing_ids]
    if not new_docs:
        print(f"[NetLab] Knowledge base already seeded ({len(existing_ids)} entries). Skipping.")
    else:
        collection.add(
            documents=[k["text"] for k in new_docs],
            ids=[k["id"] for k in new_docs],
            metadatas=[k["meta"] for k in new_docs],
        )
        print(f"[NetLab] Added {len(new_docs)} knowledge entries.")

    total = collection.count()
    print(f"[NetLab] Total knowledge entries: {total}")

    if gemini_expand:
        expand_with_gemini(collection)

def expand_with_gemini(collection):
    """Use Gemini Flash to generate additional knowledge chunks."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[Gemini] GEMINI_API_KEY not set. Skipping Gemini expansion.")
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    topics = [
        "Common TP-Link router error messages and their fixes for Malaysian users",
        "ASUS router log messages and troubleshooting steps",
        "MikroTik RouterOS log messages for network administrators",
        "WiFi interference problems in Malaysian apartments and condominiums",
        "Unifi Malaysia fiber common outage patterns and self-service fixes",
        "Network security threats common in Malaysia: botnets, cryptominers, ransomware entry via routers",
        "How to read and interpret router syslog timestamps and severity levels",
        "DHCP lease exhaustion and IP conflict troubleshooting for home networks",
        "QoS (Quality of Service) setup for video calls on Malaysian home routers",
        "IPv6 configuration for Unifi, Maxis, and Time fiber connections in Malaysia",
    ]

    print(f"[Gemini] Generating {len(topics)} knowledge expansions...")
    existing = collection.get()
    existing_ids = set(existing["ids"])

    for i, topic in enumerate(topics):
        doc_id = f"gemini_{i:03d}"
        if doc_id in existing_ids:
            print(f"[Gemini] Skipping {doc_id} (already exists)")
            continue

        try:
            prompt = f"""Write a concise, factual technical knowledge entry about: {topic}

Format it as plain text, 150-250 words. Include:
- Common symptoms or log messages
- Root causes
- Step-by-step fixes
- Specific product names, model numbers, or ISP names where relevant (Malaysian context)

Do not use markdown headers. Write in paragraph or numbered list format."""

            response = model.generate_content(prompt)
            text = response.text.strip()

            collection.add(
                documents=[text],
                ids=[doc_id],
                metadatas=[{"category": "gemini_generated", "topic": topic}],
            )
            print(f"[Gemini] Added: {doc_id} - {topic[:50]}...")
        except Exception as e:
            print(f"[Gemini] Failed for topic '{topic[:40]}': {e}")

    print(f"[Gemini] Knowledge expansion complete. Total: {collection.count()}")

if __name__ == "__main__":
    expand = "--gemini" in sys.argv
    seed(gemini_expand=expand)
    print("[NetLab] Done. Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload")

# ─── Language Style Note (injected into system prompt context) ───────────────
# Zainal's preference for Malaysian Malay register:
# - "tak" not "tidak" (more natural, colloquial)
# - "tak boleh" not "tidak boleh"
# - "tak tahu" not "tidak tahu"
# - "tak ada" not "tiada" (in casual speech)
# - Keep it casual and warm, like WhatsApp messages between friends
# This should be added to the BM system prompt in main.py
