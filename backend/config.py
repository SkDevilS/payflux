import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database Configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'moneyone_db')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-super-secret-jwt-key')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour (longer than 15 min session timeout)
    
    # PayU Configuration
    PAYU_MERCHANT_KEY = os.getenv('PAYU_MERCHANT_KEY', '')
    PAYU_MERCHANT_SALT = os.getenv('PAYU_MERCHANT_SALT', '')
    PAYU_BASE_URL = os.getenv('PAYU_BASE_URL', 'https://secure.payu.in')
    PAYU_TEST_MODE = os.getenv('PAYU_TEST_MODE', 'True') == 'True'
    
    # PayU2 Configuration (S2S Intent UPI)
    PAYU2_MERCHANT_KEY = os.getenv('PAYU2_MERCHANT_KEY', '')
    PAYU2_MERCHANT_SALT = os.getenv('PAYU2_MERCHANT_SALT', '')
    PAYU2_BASE_URL = os.getenv('PAYU2_BASE_URL', 'https://secure.payu.in')
    PAYU2_TEST_MODE = os.getenv('PAYU2_TEST_MODE', 'True') == 'True'

    
    # PayU Payout Configuration
    PAYU_PAYOUT_CLIENT_ID = os.getenv('PAYU_PAYOUT_CLIENT_ID', '')
    PAYU_PAYOUT_USERNAME = os.getenv('PAYU_PAYOUT_USERNAME', '')
    PAYU_PAYOUT_PASSWORD = os.getenv('PAYU_PAYOUT_PASSWORD', '')
    PAYU_PAYOUT_MERCHANT_ID = os.getenv('PAYU_PAYOUT_MERCHANT_ID', '')
    PAYU_PAYOUT_BASE_URL = os.getenv('PAYU_PAYOUT_BASE_URL', 'https://uatoneapi.payu.in')
    PAYU_PAYOUT_AUTH_URL = os.getenv('PAYU_PAYOUT_AUTH_URL', 'https://uat-accounts.payu.in')
    
    # Mudrape Configuration
    MUDRAPE_BASE_URL = os.getenv('MUDRAPE_BASE_URL', 'https://agentmudrape.com')
    MUDRAPE_API_KEY = os.getenv('MUDRAPE_API_KEY', 'pk_2580642bf7f031983a0390755ee52b9e')
    MUDRAPE_API_SECRET = os.getenv('MUDRAPE_API_SECRET', 'sk_af9c19bef57d63c100b01b174258ee3693761a6bb679d1676b6930dcb4985688')
    MUDRAPE_USER_ID = os.getenv('MUDRAPE_USER_ID', 'cmlujaiqv00tw01s6up9o7376')
    MUDRAPE_MERCHANT_MID = os.getenv('MUDRAPE_MERCHANT_MID', '')
    MUDRAPE_MERCHANT_EMAIL = os.getenv('MUDRAPE_MERCHANT_EMAIL', '')
    MUDRAPE_MERCHANT_SECRET = os.getenv('MUDRAPE_MERCHANT_SECRET', '')
    
    # Tourquest Configuration
    TOURQUEST_BASE_URL = os.getenv('TOURQUEST_BASE_URL', 'https://payment.tourquest.travel')
    TOURQUEST_SECRET_KEY = os.getenv('TOURQUEST_SECRET_KEY', '0DV7E5Zdw4WbEsGrfdsbEVQnJHNqttRc')
    TOURQUEST_SALT_KEY = os.getenv('TOURQUEST_SALT_KEY', 'iVsDOCf77pZWpfyyjbTjRbqlQobp34buQkfwEB4ab')
    
    # PayTouch Configuration
    PAYTOUCH_BASE_URL = os.getenv('PAYTOUCH_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    PAYTOUCH_TOKEN = os.getenv('PAYTOUCH_TOKEN', 'ON2gMaaJaIJG2HIyE3I7M9EwnmeKvE')
    
    # PayTouch2 Configuration (New Integration with Different Keys)
    PAYTOUCH2_BASE_URL = os.getenv('PAYTOUCH2_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    PAYTOUCH2_TOKEN = os.getenv('PAYTOUCH2_TOKEN', 'NEW_TOKEN_FROM_PAYTOUCH_DASHBOARD')
    
    # PayTouch3_Trendora Configuration (Trendora Integration)
    PAYTOUCH3_BASE_URL = os.getenv('PAYTOUCH3_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    PAYTOUCH3_TOKEN = os.getenv('PAYTOUCH3_TOKEN', 'TRENDORA_TOKEN_FROM_PAYTOUCH_DASHBOARD')
    
    # PayTouch4_Barringer Configuration (Barringer Integration)
    PAYTOUCH4_BASE_URL = os.getenv('PAYTOUCH4_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    PAYTOUCH4_TOKEN = os.getenv('PAYTOUCH4_TOKEN', 'BARRINGER_TOKEN_FROM_PAYTOUCH_DASHBOARD')
    
    # Airpay Configuration
    AIRPAY_BASE_URL = os.getenv('AIRPAY_BASE_URL', 'https://kraken.airpay.co.in')
    AIRPAY_CLIENT_ID = os.getenv('AIRPAY_CLIENT_ID', '')
    AIRPAY_CLIENT_SECRET = os.getenv('AIRPAY_CLIENT_SECRET', '')
    AIRPAY_MERCHANT_ID = os.getenv('AIRPAY_MERCHANT_ID', '')
    AIRPAY_USERNAME = os.getenv('AIRPAY_USERNAME', '')
    AIRPAY_PASSWORD = os.getenv('AIRPAY_PASSWORD', '')
    AIRPAY_ENCRYPTION_KEY = os.getenv('AIRPAY_ENCRYPTION_KEY', '')
    AIRPAY_SECRET = os.getenv('AIRPAY_SECRET', os.getenv('AIRPAY_CLIENT_SECRET', ''))  # Default to client_secret if not provided
    
    # Airpay Grosmart2 Configuration (Separate credentials)
    AIRPAY_GROSMART2_BASE_URL = os.getenv('AIRPAY_GROSMART2_BASE_URL', 'https://kraken.airpay.co.in')
    AIRPAY_GROSMART2_CLIENT_ID = os.getenv('AIRPAY_GROSMART2_CLIENT_ID', 'clc537')
    AIRPAY_GROSMART2_CLIENT_SECRET = os.getenv('AIRPAY_GROSMART2_CLIENT_SECRET', '87a3bb9a5bd5d248354f45eca114eda7')
    AIRPAY_GROSMART2_MERCHANT_ID = os.getenv('AIRPAY_GROSMART2_MERCHANT_ID', '354479')
    AIRPAY_GROSMART2_USERNAME = os.getenv('AIRPAY_GROSMART2_USERNAME', '5jfP5PJgQz')
    AIRPAY_GROSMART2_PASSWORD = os.getenv('AIRPAY_GROSMART2_PASSWORD', 'mAhxEpu7')
    AIRPAY_GROSMART2_ENCRYPTION_KEY = os.getenv('AIRPAY_GROSMART2_ENCRYPTION_KEY', 'kU5xR45Ba7ggurrh')
    AIRPAY_GROSMART2_SECRET = os.getenv('AIRPAY_GROSMART2_SECRET', os.getenv('AIRPAY_GROSMART2_CLIENT_SECRET', '87a3bb9a5bd5d248354f45eca114eda7'))
    
    # Paytouchpayin Configuration (QR PAYIN API - Updated 2026)
    PAYTOUCHPAYIN_BASE_URL = os.getenv('PAYTOUCHPAYIN_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    PAYTOUCHPAYIN_TOKEN = os.getenv('PAYTOUCHPAYIN_TOKEN', 'izrfvcnddMzlf5B142yDH4PDkkoDUMPP')
    
    # SkrillPe Configuration
    SKRILLPE_BASE_URL = os.getenv('SKRILLPE_BASE_URL', 'https://clientapisrv.skrillpe.com/poutsaps')
    SKRILLPE_MOBILE_NUMBER = os.getenv('SKRILLPE_MOBILE_NUMBER', '7376582857')
    SKRILLPE_MID = os.getenv('SKRILLPE_MPIN', '28619924')
    SKRILLPE_API_KEY = os.getenv('SKRILLPE_API_KEY', 'F8D12F51-1732-4787-B8DD-7858A41E396F')
    SKRILLPE_API_PASSWORD = os.getenv('SKRILLPE_API_PASSWORD', '8DB03D51BB9A4CFDB8F35B1E7572433A')
    SKRILLPE_COMPANY_ALIAS = os.getenv('SKRILLPE_COMPANY_ALIAS', 'TESTCOMPANY')
    SKRILLPE_VPA = os.getenv('SKRILLPE_VPA', 'skrillpe@idfcbank')
    
    # Rang Configuration
    RANG_BASE_URL = os.getenv('RANG_BASE_URL', 'https://api.rangriwaz.in')
    RANG_SECRET_KEY = os.getenv('RANG_SECRET_KEY', 'OJYMJ8M3B9SV18DK')
    RANG_MID = os.getenv('RANG_MID', 'APIPA100015')
    RANG_EMAIL = os.getenv('RANG_EMAIL', 'indrajeet@mudrape.com')
    
    # VIYONAPAY Configuration
    VIYONAPAY_BASE_URL = os.getenv('VIYONAPAY_BASE_URL', 'https://core.viyonapay.com')
    VIYONAPAY_CLIENT_ID = os.getenv('VIYONAPAY_CLIENT_ID', '')
    VIYONAPAY_CLIENT_SECRET = os.getenv('VIYONAPAY_CLIENT_SECRET', '')
    VIYONAPAY_API_KEY = os.getenv('VIYONAPAY_API_KEY', '')
    VIYONAPAY_VPA = os.getenv('VIYONAPAY_VPA', 'vfipl.188690284791@kvb')
    VIYONAPAY_CLIENT_PRIVATE_KEY_PATH = os.getenv('VIYONAPAY_CLIENT_PRIVATE_KEY_PATH', 'keys/viyonapay_client_private.pem')
    VIYONAPAY_SERVER_PUBLIC_KEY_PATH = os.getenv('VIYONAPAY_SERVER_PUBLIC_KEY_PATH', 'keys/viyonapay_server_public.pem')
    VIYONAPAY_WEBHOOK_SECRET_KEY = os.getenv('VIYONAPAY_WEBHOOK_SECRET_KEY', '')  # 16-byte hex key for webhook decryption
    
    # VIYONAPAY Barringer Configuration
    VIYONAPAY_BARRINGER_CLIENT_ID = os.getenv('VIYONAPAY_BARRINGER_CLIENT_ID', '')
    VIYONAPAY_BARRINGER_CLIENT_SECRET = os.getenv('VIYONAPAY_BARRINGER_CLIENT_SECRET', '')
    VIYONAPAY_BARRINGER_API_KEY = os.getenv('VIYONAPAY_BARRINGER_API_KEY', '')
    VIYONAPAY_BARRINGER_VPA = os.getenv('VIYONAPAY_BARRINGER_VPA', '')
    VIYONAPAY_BARRINGER_CLIENT_PRIVATE_KEY_PATH = os.getenv('VIYONAPAY_BARRINGER_CLIENT_PRIVATE_KEY_PATH', 'keys/viyonapay_barringer_client_private.pem')
    VIYONAPAY_BARRINGER_SERVER_PUBLIC_KEY_PATH = os.getenv('VIYONAPAY_BARRINGER_SERVER_PUBLIC_KEY_PATH', 'keys/viyonapay_barringer_server_public.pem')
    VIYONAPAY_BARRINGER_WEBHOOK_SECRET_KEY = os.getenv('VIYONAPAY_BARRINGER_WEBHOOK_SECRET_KEY', os.getenv('VIYONAPAY_WEBHOOK_SECRET_KEY', ''))  # Falls back to Truaxis key if not set
    
    # Sabpaisa Grosmart Configuration
    SABPAISA_GROSMART_BASE_URL = os.getenv('SABPAISA_GROSMART_BASE_URL', 'https://merchant-api.sabpaisa.in')
    SABPAISA_GROSMART_CLIENT_CODE = os.getenv('SABPAISA_GROSMART_CLIENT_CODE', 'GROS1')
    SABPAISA_GROSMART_API_KEY = os.getenv('SABPAISA_GROSMART_API_KEY', 'sp_VnZyfhBwunpPlq2-OqZdzGx-jwtW7e4ma5oFJZyzC-g')
    SABPAISA_GROSMART_SECRET_KEY = os.getenv('SABPAISA_GROSMART_SECRET_KEY', 'sec_nO_3BmCMpUOSRcvABZylNmac7g5LumG4zAamrNgmbPQ')
    SABPAISA_GROSMART_WEBHOOK_SECRET = os.getenv('SABPAISA_GROSMART_WEBHOOK_SECRET', '')  # To be provided by Sabpaisa team
    
    # Oxymoney_Grosmart Configuration (TransXT API)
    OXYMONEY_GROSMART_BASE_URL = os.getenv('OXYMONEY_GROSMART_BASE_URL', 'https://api.transxt.in')
    OXYMONEY_GROSMART_USERNAME = os.getenv('OXYMONEY_GROSMART_USERNAME', 'API0439')
    OXYMONEY_GROSMART_PASSWORD = os.getenv('OXYMONEY_GROSMART_PASSWORD', 'urLitaHFjHdpI8zU32KQYw==')
    OXYMONEY_GROSMART_SECRET_KEY = os.getenv('OXYMONEY_GROSMART_SECRET_KEY', 'MahE4XRtiTekgoKJdvk5r5zkwh1fll79')
    OXYMONEY_GROSMART_INITIAL_AUTH_TOKEN = os.getenv('OXYMONEY_GROSMART_INITIAL_AUTH_TOKEN', 'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI4MTIiLCJzdWIiOiJhdXRoIiwiaXNzIjoiVFJBTlNYVCIsIlNFU1NJT05JRCI6IjAiLCJTRUNSRVQiOiIiLCJQUk9ETElTVCI6W10sIlVTRVJJRCI6IjAiLCJQT1JUQUwiOiIiLCJFTlYiOiJwcm9kIn0.5oOCcEOpIc7J-KIwWdW21jQ77aOxX7iUwe4y7EhE69YL0oKgS-B-UWBaHyIZhNqRJS93_GvGGyuGTurLE60fNgI')
    OXYMONEY_GROSMART_MID = os.getenv('OXYMONEY_GROSMART_MID', '')  # Merchant ID from TransXT
    OXYMONEY_GROSMART_BPM_IDENTIFIER = os.getenv('OXYMONEY_GROSMART_BPM_IDENTIFIER', '')  # BPM identifier from TransXT
    
    # Oxymoney_Grosmart VPAs (5 VPAs with 9 Lakh daily limit each)
    OXYMONEY_GROSMART_VPA1 = os.getenv('OXYMONEY_GROSMART_VPA1', 'gro20266202@suryoday')
    OXYMONEY_GROSMART_VPA2 = os.getenv('OXYMONEY_GROSMART_VPA2', 'gro82929208@suryoday')
    OXYMONEY_GROSMART_VPA3 = os.getenv('OXYMONEY_GROSMART_VPA3', 'gro73936629@suryoday')
    OXYMONEY_GROSMART_VPA4 = os.getenv('OXYMONEY_GROSMART_VPA4', 'gro28166919@suryoday')
    OXYMONEY_GROSMART_VPA5 = os.getenv('OXYMONEY_GROSMART_VPA5', 'gro28810077@suryoday')
    
    # Oxymoney_Truaxis Configuration (TransXT API - Separate credentials)
    OXYMONEY_TRUAXIS_BASE_URL = os.getenv('OXYMONEY_TRUAXIS_BASE_URL', 'https://api.transxt.in')
    OXYMONEY_TRUAXIS_USERNAME = os.getenv('OXYMONEY_TRUAXIS_USERNAME', 'API0439')
    OXYMONEY_TRUAXIS_PASSWORD = os.getenv('OXYMONEY_TRUAXIS_PASSWORD', 'urLitaHFjHdpI8zU32KQYw==')
    OXYMONEY_TRUAXIS_SECRET_KEY = os.getenv('OXYMONEY_TRUAXIS_SECRET_KEY', 'MahE4XRtiTekgoKJdvk5r5zkwh1fll79')
    OXYMONEY_TRUAXIS_INITIAL_AUTH_TOKEN = os.getenv('OXYMONEY_TRUAXIS_INITIAL_AUTH_TOKEN', 'eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI4MTIiLCJzdWIiOiJhdXRoIiwiaXNzIjoiVFJBTlNYVCIsIlNFU1NJT05JRCI6IjAiLCJTRUNSRVQiOiIiLCJQUk9ETElTVCI6W10sIlVTRVJJRCI6IjAiLCJQT1JUQUwiOiIiLCJFTlYiOiJwcm9kIn0.5oOCcEOpIc7J-KIwWdW21jQ77aOxX7iUwe4y7EhE69YL0oKgS-B-UWBaHyIZhNqRJS93_GvGGyuGTurLE60fNg')
    OXYMONEY_TRUAXIS_MID = os.getenv('OXYMONEY_TRUAXIS_MID', 'MER0000000031326')
    OXYMONEY_TRUAXIS_BPM_IDENTIFIER = os.getenv('OXYMONEY_TRUAXIS_BPM_IDENTIFIER', '')
    
    # Oxymoney_Truaxis VPAs (5 VPAs with 9.9 Lakh daily limit each)
    OXYMONEY_TRUAXIS_VPA1 = os.getenv('OXYMONEY_TRUAXIS_VPA1', 'tru20266202@suryoday')
    OXYMONEY_TRUAXIS_VPA2 = os.getenv('OXYMONEY_TRUAXIS_VPA2', 'tru82992982@suryoday')
    OXYMONEY_TRUAXIS_VPA3 = os.getenv('OXYMONEY_TRUAXIS_VPA3', 'tru28919967@suryoday')
    OXYMONEY_TRUAXIS_VPA4 = os.getenv('OXYMONEY_TRUAXIS_VPA4', 'tru87368299@suryoday')
    OXYMONEY_TRUAXIS_VPA5 = os.getenv('OXYMONEY_TRUAXIS_VPA5', 'tru29918763@suryoday')
    
    # Oxymoney_Barringer Configuration (TransXT API - Separate credentials)
    OXY_BAR_BASE_URL = os.getenv('OXY_BAR_BASE_URL', 'https://api.transxt.in')
    OXY_BAR_USERNAME = os.getenv('OXY_BAR_USERNAME', '')
    OXY_BAR_PASSWORD = os.getenv('OXY_BAR_PASSWORD', '')
    OXY_BAR_SECRET_KEY = os.getenv('OXY_BAR_SECRET_KEY', '')
    OXY_BAR_INITIAL_AUTH_TOKEN = os.getenv('OXY_BAR_INITIAL_AUTH_TOKEN', '')
    OXY_BAR_MID = os.getenv('OXY_BAR_MID', '')
    OXY_BAR_BPM_IDENTIFIER = os.getenv('OXY_BAR_BPM_IDENTIFIER', '')
    
    # Oxymoney_Barringer VPAs (5 VPAs with 9.9 Lakh daily limit each)
    OXY_BAR_VPA1 = os.getenv('OXY_BAR_VPA1', '')
    OXY_BAR_VPA2 = os.getenv('OXY_BAR_VPA2', '')
    OXY_BAR_VPA3 = os.getenv('OXY_BAR_VPA3', '')
    OXY_BAR_VPA4 = os.getenv('OXY_BAR_VPA4', '')
    OXY_BAR_VPA5 = os.getenv('OXY_BAR_VPA5', '')
    
    # RMS_JSS Configuration
    RMSJSS_BASE_URL = os.getenv('RMSJSS_BASE_URL', 'https://rmstrade.online')
    RMSJSS_API_TOKEN = os.getenv('RMSJSS_API_TOKEN', '')
    
    # RMS_HAMSTER Configuration
    RMSHAMSTER_BASE_URL = os.getenv('RMSHAMSTER_BASE_URL', 'https://rmstrade.online')
    RMSHAMSTER_API_TOKEN = os.getenv('RMSHAMSTER_API_TOKEN', '')
    
    # RMS_MEGACART Configuration
    RMSMEGACART_BASE_URL = os.getenv('RMSMEGACART_BASE_URL', 'https://rmstrade.online')
    RMSMEGACART_API_TOKEN = os.getenv('RMSMEGACART_API_TOKEN', '')
    
    # RMS_APEX Configuration
    RMSAPEX_BASE_URL = os.getenv('RMSAPEX_BASE_URL', 'https://rmstrade.online')
    RMSAPEX_API_TOKEN = os.getenv('RMSAPEX_API_TOKEN', '')
    
    # MONEYONE Configuration
    MONEYONE_BASE_URL = os.getenv('MONEYONE_BASE_URL', 'https://api.moneyone.co.in')
    MONEYONE_MERCHANT_ID = os.getenv('MONEYONE_MERCHANT_ID', '')
    MONEYONE_PASSWORD = os.getenv('MONEYONE_PASSWORD', '')
    MONEYONE_AUTH_KEY = os.getenv('MONEYONE_AUTH_KEY', '')
    MONEYONE_MODULE_SECRET = os.getenv('MONEYONE_MODULE_SECRET', '')
    MONEYONE_AES_KEY = os.getenv('MONEYONE_AES_KEY', '')
    MONEYONE_AES_IV = os.getenv('MONEYONE_AES_IV', '')
    MNONE_TPIN = os.getenv('MNONE_TPIN', '')
    
    # RUPIPAY Configuration
    RUPIPAY_BASE_URL = os.getenv('RUPIPAY_BASE_URL', 'https://api.rupipay.co.in')
    RUPIPAY_MERCHANT_ID = os.getenv('RUPIPAY_MERCHANT_ID', '')
    RUPIPAY_PASSWORD = os.getenv('RUPIPAY_PASSWORD', '')
    RUPIPAY_AUTH_KEY = os.getenv('RUPIPAY_AUTH_KEY', '')
    RUPIPAY_MODULE_SECRET = os.getenv('RUPIPAY_MODULE_SECRET', '')
    RUPIPAY_AES_KEY = os.getenv('RUPIPAY_AES_KEY', '')
    RUPIPAY_AES_IV = os.getenv('RUPIPAY_AES_IV', '')
    RUPIPAY_TPIN = os.getenv('RUPIPAY_TPIN', '')
    
    # MONEYONE2 Configuration
    MONEYONE2_BASE_URL = os.getenv('MONEYONE2_BASE_URL', 'https://api.moneyone.co.in')
    MONEYONE2_MERCHANT_ID = os.getenv('MONEYONE2_MERCHANT_ID', '')
    MONEYONE2_PASSWORD = os.getenv('MONEYONE2_PASSWORD', '')
    MONEYONE2_AUTH_KEY = os.getenv('MONEYONE2_AUTH_KEY', '')
    MONEYONE2_MODULE_SECRET = os.getenv('MONEYONE2_MODULE_SECRET', '')
    MONEYONE2_AES_KEY = os.getenv('MONEYONE2_AES_KEY', '')
    MONEYONE2_AES_IV = os.getenv('MONEYONE2_AES_IV', '')
    MNONE2_TPIN = os.getenv('MNONE2_TPIN', '')
    
    # HDFC Paytouch_Barringer Configuration (PAYIN)
    HDFC_PAYTOUCH_BARRINGER_BASE_URL = os.getenv('HDFC_PAYTOUCH_BARRINGER_BASE_URL', 'https://dashboard.shreefintechsolutions.com')
    HDFC_PAYTOUCH_BARRINGER_TOKEN = os.getenv('HDFC_PAYTOUCH_BARRINGER_TOKEN', '')
    
    # Thefoxes Configuration
    THEFOXES_BASE_URL = os.getenv('THEFOXES_BASE_URL', 'https://api.thefoxes.in')
    THEFOXES_SECRET_KEY = os.getenv('THEFOXES_SECRET_KEY', '')
    THEFOXES_SECRET_HASH = os.getenv('THEFOXES_SECRET_HASH', '')
    THEFOXES_AES_IV = os.getenv('THEFOXES_AES_IV', 'a1f4c88b637e29cd3e1bc5a9d4b087ac')
    
    # Paytm Megacart Configuration (UPI Intent Payin)
    PAYTM_MEGACART_BASE_URL = os.getenv('PAYTM_MEGACART_BASE_URL', 'https://securegw.paytm.in')
    PAYTM_MEGACART_MID = os.getenv('PAYTM_MEGACART_MID', '')
    PAYTM_MEGACART_MERCHANT_KEY = os.getenv('PAYTM_MEGACART_MERCHANT_KEY', '')
    PAYTM_MEGACART_WEBSITE_NAME = os.getenv('PAYTM_MEGACART_WEBSITE_NAME', 'DEFAULT')
    
    # Singpay Configuration
    SINGPAY_BASE_URL = os.getenv('SINGPAY_BASE_URL', 'https://api.singpay.in')
    SINGPAY_MERCHANT_ID = os.getenv('SINGPAY_MERCHANT_ID', '1')
    SINGPAY_SECRET_KEY = os.getenv('SINGPAY_SECRET_KEY', 'Your_Secret_Key')
    SINGPAY_MERCHANT_NO = os.getenv('SINGPAY_MERCHANT_NO', '')
    
    # SMTP Email Configuration
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'noreply@moneyone.co.in')
    SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'MoneyOne')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'True') == 'True'
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(',')
    CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True') == 'True'
    
    # Uploads Configuration
    UPLOADS_BASE_URL = os.getenv('UPLOADS_BASE_URL', 'http://localhost:5000/uploads')
    UPLOADS_FOLDER = os.getenv('UPLOADS_FOLDER', 'uploads')
    MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', '5242880'))  # 5MB default
    ALLOWED_EXTENSIONS = os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,pdf').split(',')
