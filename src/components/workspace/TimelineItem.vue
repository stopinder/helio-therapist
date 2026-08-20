<template>
  <div class="flex gap-inline-md group relative">
    <div class="flex flex-col items-center">
      <div class="w-9 h-9 rounded-pill flex items-center justify-center shrink-0 z-10 border bg-surface-raised transition-colors duration-standard" :class="typeClasses.icon">
        <component :is="eventIcon" class="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
      </div>
      <div v-if="!isLast" class="w-px h-full bg-border -mt-1 group-last:hidden"></div>
    </div>
    <div class="flex-1 pb-stack-lg min-w-0">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-stack-xs">
        <h4 class="type-ui font-semibold text-ink">{{ presentation.detail }}</h4>
        <span class="type-metadata text-ink-muted sm:text-right">{{ date }}</span>
      </div>
      <div @click="handleClick" class="px-inline-md py-stack-md bg-surface-raised border border-border rounded-control transition-colors duration-standard" :class="isNavigatable ? 'hover:border-accent cursor-pointer' : ''">
        <p class="type-body text-ink-secondary">{{ description }}</p>
        <span v-if="isNavigatable" class="sr-only">Open related clinical workspace</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { CalendarDaysIcon, ChartBarIcon, ExclamationTriangleIcon, ArrowUpRightIcon, DocumentTextIcon, FlagIcon } from '@heroicons/vue/24/outline';
import { timelineEventPresentation } from '../../lib/clinicalExchange.js';

const props = defineProps({ eventType:{type:String,required:true}, date:{type:String,required:true}, description:{type:String,required:true}, subjectType:{type:String,default:null}, subjectId:{type:String,default:null}, sessionId:{type:String,default:null}, isLast:{type:Boolean,default:false} });
const router=useRouter(); const route=useRoute();
const presentation=computed(()=>timelineEventPresentation(props.eventType));
const isNavigatable=computed(()=>(props.subjectType==='session'||props.eventType==='session_completed')&&(props.subjectId||props.sessionId));
const eventIcon=computed(()=>({session_completed:CalendarDaysIcon,outcome_measure_recorded:ChartBarIcon,risk_assessment_recorded:ExclamationTriangleIcon,referral_recorded:ArrowUpRightIcon,clinical_milestone:FlagIcon}[props.eventType]||DocumentTextIcon));
const typeClasses=computed(()=>({
  session_completed:'text-success border-success/30', outcome_measure_recorded:'text-warning border-warning/30', risk_assessment_recorded:'text-danger border-danger/30', referral_recorded:'text-accent border-accent/30', diagnosis_updated:'text-ink-muted border-border', treatment_plan_updated:'text-ink-muted border-border', clinical_milestone:'text-ink-muted border-border'
}[props.eventType]||'text-ink-muted border-border'));
function handleClick(){if(!isNavigatable.value)return;const sId=props.subjectId||props.sessionId,cId=route.params.clientId;if(cId&&sId)router.push(`/clients/${cId}/sessions/${sId}`)}
</script>
