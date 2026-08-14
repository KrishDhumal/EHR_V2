import React from 'react';
import { motion } from 'framer-motion';
import { Network, Server, Cpu, Database, Share2 } from 'lucide-react';

const Coordinator = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-secondary/10 rounded-xl">
          <Network className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Coordinator AI</h1>
          <p className="text-text-secondary">System-wide Agent Orchestration Topology</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl shadow-sm relative overflow-hidden min-h-[500px] flex items-center justify-center">
         {/* Background Grid */}
         <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(rgb(var(--color-text-primary)) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
         
         {/* Network Node Architecture Graphic */}
         <div className="relative w-full max-w-4xl h-96">
            <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
               <div className="w-24 h-24 bg-surface rounded-full shadow-xl border-4 border-primary flex flex-col items-center justify-center relative shadow-[0_0_30px_rgb(var(--color-primary)/0.3)]">
                 <Cpu className="w-8 h-8 text-primary mb-1 animate-pulse" />
                 <span className="text-[10px] font-bold text-primary uppercase">Master AI</span>
               </div>
            </motion.div>

            {/* Orbiting Agents */}
            {[
              { label: 'Intake Agent', icon: Server, color: 'success', y: '-40%', x: '-30%' },
              { label: 'Triage Engine', icon: Database, color: 'warning', y: '-40%', x: '30%' },
              { label: 'Doctor Assigner', icon: Share2, color: 'secondary', y: '40%', x: '-30%' },
              { label: 'Bed Allocator', icon: Network, color: 'emergency', y: '40%', x: '30%' },
            ].map((node, i) => (
               <motion.div 
                 key={i}
                 initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: 0.5 + (i*0.2) }}
                 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
                 style={{ marginTop: node.y, marginLeft: node.x }}
               >
                 <div className={`p-4 rounded-xl bg-surface shadow-lg border border-border-color flex items-center space-x-3`}>
                    <div className={`p-2 rounded-lg bg-${node.color}/10`}>
                       <node.icon className={`w-5 h-5 text-${node.color}`} />
                    </div>
                    <span className="font-semibold text-sm text-text-primary">{node.label}</span>
                    <span className="flex h-2 w-2 relative ml-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-success"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                 </div>
                 {/* Connection Lines (SVGs or absolute divs could go here) */}
               </motion.div>
            ))}
         </div>
      </div>
    </div>
  );
};
export default Coordinator;
