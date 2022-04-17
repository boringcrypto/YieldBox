<script setup lang="ts">
import { Network } from "../../sdk/Network"
</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-light sticky-top">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">
                <img src="/yieldbox.png" alt="" height="32" />
            </a>
            <button
                class="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarSupportedContent">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <router-link class="nav-link active" aria-current="page" to="/">Home</router-link>
                    </li>
                    <li class="nav-item dropdown">
                        <a
                            class="nav-link dropdown-toggle"
                            href="#"
                            id="navbarDropdown"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            Examples
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                            <li><router-link class="dropdown-item" aria-current="page" to="/salary">Salary</router-link></li>
                            <li><router-link class="dropdown-item" aria-current="page" to="/lending">Lending</router-link></li>
                            <li><router-link class="dropdown-item" aria-current="page" to="/swap">Swap</router-link></li>
                            <li><router-link class="dropdown-item" aria-current="page" to="/escrow">Escrow</router-link></li>
                            <li><router-link class="dropdown-item" aria-current="page" to="/tokenizer">Tokenizer</router-link></li>
                        </ul>
                    </li>
                </ul>
                <ul class="navbar-nav d-flex">
                    <li class="nav-item nav-link">
                        <span v-if="app.web3.connector?.chainId !== Network.HARDHAT">Switch to Hardhat!</span>
                        <span v-else>
                            {{ app.web3.connector?.chainName }}
                        </span>
                        <b-button v-if="!app.web3.address" @click="app.web3.connect()">Connect</b-button>
                    </li>
                    <li class="nav-item nav-link">
                        {{ app.web3.address }}
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    background-color: #4983e7 !important;
}
</style>
