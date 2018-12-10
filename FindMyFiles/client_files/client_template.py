from socketIO_client_nexus import SocketIO, BaseNamespace
from requests.exceptions import ConnectionError
from multiprocessing import freeze_support
import cv2 
import base64
import pyscreenshot as ImageGrab
from urllib2 import urlopen
import json
import time
import os

# User-specific credentials 
APP_ID = 'TEMPAPPID'
DEVICE_ID = TEMPDEVICEID

# IpInfo API address
IP_INFO_URL = 'http://ipinfo.io/json'

# FMF server IP -- CHANGE ME --
FMF_SERVER = 'https://192.168.0.13'

# Class to handle socket interactions with server
class Namespace(BaseNamespace):

    def on_authorized(self, *args):
        print('Authorized')
        
    def on_unauthorized(self, *args):
        print('Unauthorized')
        
    def on_reconnect(self, *args):
        print('Reconnected')
           
    def on_disconnect(self, *args):
        print('Disconnected')
        time.sleep(30)
        self.emit('authenticate', {"app_id": APP_ID, "device_id": DEVICE_ID})

        
    def on_take_webcam_picture(self, *args):
        print('Taking webcam picture...')
        cap = ''
        
        if (os.name == 'nt'):
            cap = cv2.VideoCapture(cv2.CAP_DSHOW+1)
        elif (os.name == 'posix'):
            cap = cv2.VideoCapture(0)
        else:
            self.emit('send_webcam_picture', {'data':'OS not supported.'})
            return
        
        ret, frame = cap.read()

        cv2.imwrite('webcam.jpg', frame)
        cv2.waitKey(1)

        cap.release()
        cv2.destroyAllWindows()
        
        with open('webcam.jpg', 'rb') as image_file:
            encoded_str = base64.b64encode(image_file.read())
            self.emit('send_webcam_picture', {'buffer':encoded_str})
            
    def on_take_screenshot(self, *args):
        print('Taking screenshot...')

        if (os.name == 'nt'):
            im = ImageGrab.grab()
            im.save('screenshot.jpg')
            
        elif (os.name == 'posix'):
            os.system("gnome-screenshot --file=screenshot.jpg")
        
        else:
            self.emit('send_screenshot', {'data':'OS not supported.'})
            return
        
        with open('screenshot.jpg', 'rb') as image_file:
            encoded_str = base64.b64encode(image_file.read())
            self.emit('send_screenshot', {'buffer':encoded_str})
            
    def on_get_ip_info(self, *args):
        print('Retrieving IP information...')
        
        response = urlopen(IP_INFO_URL)
        data = json.load(response)
        
        self.emit('send_ip_info', {'data':data})
        
        
def main():
    attempts = 0
    
    while attempts < 3:
        try:
            socketIO = SocketIO(FMF_SERVER, 8080, Namespace, verify=False, wait_for_connection=False)
            
            socketIO.emit('authenticate', {"app_id": APP_ID, "device_id": DEVICE_ID})
            socketIO.wait()
            
        except ConnectionError:
            attempts += 1
            time.sleep(30)
            print "Can't connect to server, trying again..."
    
if __name__ == "__main__":
    # https://github.com/pyinstaller/pyinstaller/wiki/Recipe-Multiprocessing
    # This line is needed due to a bug in Pyinstaller, the library used to generate the standalone executable from this file.
    freeze_support()

    main()