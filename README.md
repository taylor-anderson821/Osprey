Osprey generates thermaling analytics for RC sailplanes and gliders by analyzing vario telemetry emitted by Spektrum recievers. 


### About Osprey
Osprey processes Spektrum telemetry files (TLM) and generates two Excel files (XLSX) as output.  The first Excel file provides analytics and charts on thermal flying performance for each flying session, and the second Excel file maintains a record of soaring stats for each flying day. To use Osprey, you'll need a Spectrum reciever that emits vario telemetry, such as those listed [here](https://www.spektrumrc.com/radios/aircraft/receivers/?cgid=radios-aircraft-receivers&prefn1=integratedVariometer&prefv1=Yes&srule=best-matches&sz=24).  Osprey is written in Python, and is provided with stand-alone executables for both Windows and MacOS. 

### Why should I use Osprey?
Osprey provides insights into how many thermals you are catching, how long you're in them for, and the altitudes where you are entering and exiting them. You can use these analytics to better understand your thermaling performance, your thermalling progression over time, and even measure yourself against your flying peers.

### What analytics does Osprey produce?
Oprey analyzes Spektrum vario telemetry (altitude and rate of climb) and indentifies points where the glider (1) peaked in a thermal, (2) peaked after a launch, and (3) reached the bottom of any troughs between (1) and (2). Once Osprey completes this analys, it produces an XLS file that includes a chart for each session that is annotated with each thermal.
![Alt text](images/session-profile.png?raw=true)

It summarizes this data in a session summary table...

![Alt text](images/session-summary.png?raw=true)

...and in a thermal summary table.

![Alt text](images/thermal-summary.png?raw=true)

Osprey also maintains a second Excel file that summarizes thermal performance by day, allowing to you to see how your thermal skills progress over time.

![Alt text](images/daily-session-log.png?raw=true)

Osprey software has been developed using telemetry data from electric gliders. I will likely work for DLG gliders -- I just haven't had any test data.

### Getting started with Osprey

1. **Capture vario data** Set up your Spektrum transmitter to store telemetry data to the memory card.  Setup for this is in the the Telemetry view in the transmitter.  Click on "File Settings" and configure the file name and the trigger for recording telemetry.  I recommend using the trottle cut switch to start and stop recording (e.g. throttle cut OFF initiates recording). 

2. **Connect the memory card/card reader to your computer** After flying, copy the TLM file from the card to your computer using a card reader.  Then, delete the TLM file on the memory card.  If you do not delete it on the card, the next time you use Osprey it will process the new sesssions as well as older ones.

3. **Install Osprey**  Click the green 'Code' button at the top of this page and select 'Download ZIP'.  Double click on the ZIP and open it.

4. **Run Osprey**  If you're a Python user, run the Python script.  If you're a Mac or Windows person, double click on the executble.



23
