<template>
    <div v-if="tooltip" class="window" :style="tooltipStyle">
        <div class="window-body" style="min-height: 50px">
            <img ref="preview" :src="dataUrl" style="width: 50px; height: 50px; float: left; image-rendering: pixelated;" />
            <span v-if="tooltipBlock?.owner">
                {{ data.texts[tooltipBlock?.description || 0] }}<br>
                <a>{{ data.texts[tooltipBlock?.url || 0] }}</a>
            </span>
            <span v-else>
                Unowned
            </span>
        </div>
        <div class="status-bar">
            <p class="status-bar-field">{{ (tooltipBlock?.lastPrice || 0) * 2 || 0.005 }} ETH per 10x10 pixels</p>
            <p class="status-bar-field">{{ tooltipBlock?.owner ? data.texts[tooltipBlock?.owner || 0].toLowerCase() == info.address.toLowerCase() ? "Owned by you!" : "Owned by other" : "Unowned" }}</p>
        </div>
        <div v-if="tooltipBlock?.owner" class="status-bar">
            <p class="status-bar-field">{{ data.addresses[tooltipBlock.owner] }}</p><br>
        </div>
    </div>        
</template>

<script lang="ts">

import { defineComponent, PropType } from "vue"
import { PixelsToImageData } from "../classes/Blocks"
import { Block } from "../types"
import { ProviderInfo } from "../classes/ProviderInfo"
import { LocalData } from "../classes/LocalData"
import { cleanURI } from "../classes/Utils"

export default defineComponent({
    name: "Tooltip",
    props: {
        info: {
            type: Object as PropType<ProviderInfo>,
            required: true,
        }, 
        data: {
            type: Object as PropType<LocalData>,
            required: true
        },
        mx: {
            type: Number,
            required: true
        },
        my: {
            type: Number,
            required: true
        }
    },
    computed: {
        tooltip(): boolean { return this.mx != -1 && this.data.blocks.length == 10000 },
        tooltipBlock(): Block | null { return this.tooltip ? this.data.blocks[Math.floor(this.my / 10) * 100 + Math.floor(this.mx / 10)] : null},
        tooltipStyle(): string {
            let style = "position: absolute; pointer-events: none; margin: 5px; min-width: 200px; max-width: 480px;"
            style += (this.mx < 500 ? "left: " + this.mx : "right: " + (1000 - this.mx)) + "px;"
            style += "top: " + this.my + "px;"
            return style
        },
        dataUrl(): string {
            let canvas = document.createElement("CANVAS") as HTMLCanvasElement
            canvas.width = 10
            canvas.height = 10
            let ctx = canvas.getContext("2d")
            if (this.tooltipBlock?.owner && ctx) {
                ctx.imageSmoothingEnabled = false
                ctx.putImageData(PixelsToImageData(ctx, this.data.datas[this.tooltipBlock.pixels]), 0, 0)
            }
            return canvas.toDataURL()
        }
    },
    methods: {
        navigate() {
            if (this.tooltipBlock && this.tooltipBlock.url) {
                window.open(cleanURI(this.data.texts[this.tooltipBlock.url]), "_blank")
            }
        }
    }
})
</script>
