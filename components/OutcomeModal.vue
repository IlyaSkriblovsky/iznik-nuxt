<template>
  <div>
    <b-modal
      id="promisemodal"
      v-model="showModal"
      :title="message.subject"
      size="lg"
      no-stacking
    >
      <template slot="default">
        <div v-if="type === 'Taken' || type === 'Received'" class="text-center">
          <p>Please tell us who <span v-if="type === 'Taken'">took</span><span v-else>received</span> this, then we can let other people know.</p>
          <div class="d-flex justify-content-center flex-wrap">
            <label class="font-weight-bold align-middle d-flex flex-column justify-content-center mr-4">
              <span v-if="type === 'Taken'">
                Taken by:
              </span>
              <span v-if="type === 'Received'">
                Received from:
              </span>
            </label>
            <b-select
              ref="userselect"
              v-model="selectedUser"
              autofocus
              :options="userOptions"
              size="lg"
              :class="'width mb-2 font-weight-bold ' + (selectedUser === -1 ? 'text-danger' : '')"
              @change="fetchUser"
            />
          </div>
          <b-card v-if="selectedUser > 0" bg-variant="info">
            <b-card-body>
              <p>How was this freegler? Please click.</p>
              <Ratings v-if="fetchedUser" :id="fetchedUser.id" :key="'user-' + selectedUser" class="" />
            </b-card-body>
          </b-card>
          <hr>
        </div>
        <div class="text-center">
          <p class="mt-2">
            How do you feel about freegling just now?
          </p>
          <b-button-group>
            <b-button :pressed="happiness === 'Happy'" variant="primary" size="lg" class="shadow-none" @click="happiness = 'Happy'">
              <v-icon name="smile" scale="2" /> Happy
            </b-button>
            <b-button :pressed="happiness === 'Fine'" variant="white" size="lg" class="shadow-none" @click="happiness = 'Fine'">
              <v-icon name="meh" scale="2" color="grey" /> Fine
            </b-button>
            <b-button :pressed="happiness === 'Unhappy'" variant="danger" size="lg" class="shadow-none" @click="happiness = 'Unhappy'">
              <v-icon name="frown" scale="2" /> Sad
            </b-button>
          </b-button-group>
        </div>
        <div class="text-center">
          <p class="mt-2">
            You can add comments:
          </p>
          <b-textarea v-model="comments" rows="2" max-rows="6" />
          <div class="float-right text-muted mt-2">
            <span v-if="happiness === null || happiness === 'Happy' || happiness === 'Fine'">
              <v-icon name="globe-europe" /> Your comments may be public
            </span>
            <span v-if="happiness === 'Unhappy'">
              <v-icon name="lock" /> Your comments will only go to our volunteers
            </span>
          </div>
        </div>
      </template>
      <template slot="modal-footer">
        <b-button variant="white" @click="cancel">
          Cancel
        </b-button>
        <b-button variant="primary" :disabled="submitDisabled" @click="submit">
          Submit
        </b-button>
      </template>
    </b-modal>
  </div>
</template>
<script>
import Ratings from './Ratings'

export default {
  components: {
    Ratings
  },
  props: {
    message: {
      type: Object,
      required: true
    },
    users: {
      validator: prop => typeof prop === 'object' || prop === null,
      required: true
    }
  },
  data: function() {
    return {
      showModal: false,
      type: null,
      happiness: null,
      comments: null,
      selectedUser: null,
      fetchedUser: null
    }
  },
  computed: {
    submitDisabled() {
      const ret = this.type !== 'Withdrawn' && this.selectedUser < 0
      return ret
    },
    userOptions() {
      const options = []

      if (this.users) {
        options.push({
          value: -1,
          html: "<em>-- Please choose (this isn't public) --</em>"
        })

        for (const user of this.users) {
          options.push({
            value: user.id,
            text: user.displayname
          })
        }

        options.push({
          value: 0,
          html: '<em>Someone else</em>'
        })
      }

      return options
    },

    groupid() {
      let ret = null

      if (this.message && this.message.groups && this.message.groups.length) {
        ret = this.message.groups[0].groupid
      }

      return ret
    }
  },
  mounted() {
    if (this.$refs.userselect) {
      this.$refs.userselect.show()
    }
  },
  methods: {
    async submit() {
      await this.$store.dispatch('messages/update', {
        action: 'Outcome',
        id: this.message.id,
        outcome: this.type,
        happiness: this.happiness,
        comment: this.comments,
        userid: this.selectedUser
      })

      this.hide()
    },

    setComments() {
      switch (this.type) {
        case 'Taken':
          this.comments = 'Thanks, this has now been taken.'
          break
        case 'Received':
          this.comments = 'Thanks, this has now been received.'
          break
        case 'Withdrawn':
          this.comments =
            this.message.type === 'Offer'
              ? 'Sorry, this is no longer available.'
              : "Thanks, I'm no longer looking for this."
          break
      }
    },

    show(type) {
      this.showModal = true
      this.type = type
      this.setComments()
      this.selectedUser = this.users.length ? -1 : 0
    },

    hide() {
      // We're having trouble capturing events from this modal, so use root as a bus.
      this.$root.$emit('outcome', this.groupid)
      this.showModal = false
    },

    cancel() {
      this.showModal = false
    },

    async fetchUser(userid) {
      if (userid) {
        await this.$store.dispatch('user/fetch', {
          id: userid,
          info: true
        })

        this.fetchedUser = this.$store.getters['user/get'](userid)
      }
    }
  }
}
</script>
<style scoped lang="scss">
@import 'color-vars';

option {
  color: $color-black !important;
}

.btn[aria-pressed='true'] {
  box-shadow: 0px 0px 5px 2px $color-blue--base !important;
}

select {
  width: auto;
}
</style>
