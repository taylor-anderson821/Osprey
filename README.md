Osprey generates thermaling analytics for RC sailplanes and gliders by analyzing vario telemetry emitted by Spektrum recievers. 


### About Osprey
Osprey processes Spektrum telemetry TLM files and generates two Excel files as output.  The first Excel file provides analytics and charts on thermal flying performance for each flying session, and the second Excel file maintains a record of soaring stats for each flying day. To use Osprey, you'll need a Spectrum reciever that emits vario telemetry, such as those listed [here](https://www.spektrumrc.com/radios/aircraft/receivers/?cgid=radios-aircraft-receivers&prefn1=integratedVariometer&prefv1=Yes&srule=best-matches&sz=24).  Osprey is written in Python, and is provided with stand-alone executables for both Windows and MacOS. 

### Why should I use Osprey?
Osprey provides insights into how many thermals you are catching, how long you're in them for, and the altitudes where you are entering and exiting them. You can use these analytics to better understand your thermaling performance, your thermalling progression over time, and even measure yourself against your flying peers.

### What analytics does Osprey produce?
Oprey analyzes Spektrum vario telemetry (altitude and rate of climb) and indentifies points where the glider (1) peaked in a thermal, (2) peaked after a launch, and (3) reached the bottom of any troughs between (1) and (2). Once Osprey completes this analys, it produces an XLS file that includes a chart for each session that is annotated with each thermal.
![Alt text](images/session-profile.png?raw=true)

It also summarizes sessions in a session summary table...

![Alt text](images/session-summary.png?raw=true)

...and summarizes the thermals caught.

![Alt text](images/thermal-summary.png?raw=true)

Osprey also maintains a second XLS that summarizes thermal performance by day, allowing to you to see how your thermal skills progress over time.

![Alt text](images/daily-session-log.png?raw=true)

Osprey software has been tested on telemetry data from e-gliders, but may be adjusted to run analytics on DLG data as well for those inclined to adjust Osprey parameters.

***W***
![Alt text](images/session-profile.png?raw=true)


and also summarizes the thermals caught

23
