/* global AudioWorkletProcessor, sampleRate, registerProcessor */
class OrionCallAudio extends AudioWorkletProcessor {
  constructor(){super();this.frame=new Int16Array(640);this.used=0;this.position=0;this.step=sampleRate/16000;this.enabled=false;this.port.onmessage=event=>{this.enabled=event.data?.enabled===true;this.used=0;this.position=0;};}
  process(inputs){
    const data=inputs[0]?.[0];if(!data||!this.enabled)return true;
    while(this.position<data.length){
      const value=Math.max(-1,Math.min(1,data[Math.floor(this.position)]||0));
      this.frame[this.used++]=Math.round(value*32767);this.position+=this.step;
      if(this.used===640){this.port.postMessage(this.frame.buffer,[this.frame.buffer]);this.frame=new Int16Array(640);this.used=0;}
    }
    this.position-=data.length;return true;
  }
}
registerProcessor('orion-call-audio',OrionCallAudio);
