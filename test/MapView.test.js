import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('mapbox-gl', () => {
  class MockMap {
    constructor() {
      this.addControl = vi.fn()
      this.on = vi.fn()
      this.getSource = vi.fn()
      this.getLayer = vi.fn()
      this.removeLayer = vi.fn()
      this.removeSource = vi.fn()
      this.addSource = vi.fn()
      this.addLayer = vi.fn()
      this.getCanvas = vi.fn(() => ({ style: {} }))
      this.once = vi.fn()
    }
  }

  class MockNavigationControl {}

  return {
    default: {
      accessToken: '',
      Map: MockMap,
      NavigationControl: MockNavigationControl,
    },
  }
})

vi.mock('../src/unitCalculator.js', () => ({
  UnitCalculator: {
    calcAnnualProbability: vi.fn(() => 0.05),
    calc20YearProbability: vi.fn(() => 0.6),
    calcUnitsIfRedeveloped: vi.fn(() => 10),
    calcExpectedUnits: vi.fn(() => 6),
    calcTotalExpectedUnits: vi.fn(() => 1000),
    PROB_WEIGHTS: {},
    UNITS_WEIGHTS: {},
    MACRO_SCENARIOS: {},
  },
}))

import MapView from '../src/components/MapView.vue'

describe('MapView Component', () => {
  let wrapper

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
        text: () => Promise.resolve('mapblklot\n123'),
      })
    ))

    wrapper = mount(MapView, {
      global: {
        stubs: {
          teleport: true,
        },
      },
    })
  })

  describe('Modal State', () => {
    it('modal is hidden by default', () => {
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('opens add rule modal when button clicked', async () => {
      await wrapper.find('.add-rule').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-header h3').text()).toBe('Add Rule')
    })

    it('closes modal when cancel clicked', async () => {
      await wrapper.find('.add-rule').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.find('.modal-cancel').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('closes modal when overlay clicked', async () => {
      await wrapper.find('.add-rule').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)

      await wrapper.find('.modal-overlay').trigger('click')
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })
  })

  describe('Info Modal', () => {
    it('info modal is hidden by default', () => {
      expect(wrapper.findAll('.modal-overlay').length).toBe(0)
    })

    it('opens info modal when info button clicked', async () => {
      await wrapper.find('.info-icon').trigger('click')
      expect(wrapper.find('.info-modal').exists()).toBe(true)
      expect(wrapper.find('.info-modal h3').text()).toBe('What is BYO Zoning?')
    })

    it('closes info modal when Got it clicked', async () => {
      await wrapper.find('.info-icon').trigger('click')
      expect(wrapper.find('.info-modal').exists()).toBe(true)

      await wrapper.find('.info-modal .modal-save').trigger('click')
      expect(wrapper.find('.info-modal').exists()).toBe(false)
    })
  })

  describe('Rule Form Validation', () => {
    it('save button is disabled when height is empty', async () => {
      await wrapper.find('.add-rule').trigger('click')
      const saveBtn = wrapper.find('.modal-save')
      expect(saveBtn.attributes('disabled')).toBeDefined()
    })

    it('save button is enabled when height is entered', async () => {
      await wrapper.find('.add-rule').trigger('click')
      const heightInput = wrapper.find('.height-input')
      await heightInput.setValue('85')

      const saveBtn = wrapper.find('.modal-save')
      expect(saveBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Sidebar Display', () => {
    it('displays app title', () => {
      expect(wrapper.find('h1').text()).toBe('BYO Zoning')
    })

    it('displays RHNA target', () => {
      expect(wrapper.text()).toContain('Target: 82,069')
    })

    it('displays scenarios table', () => {
      expect(wrapper.find('.scenarios-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('Low Growth')
      expect(wrapper.text()).toContain('High Growth')
      expect(wrapper.text()).toContain('FZP')
      expect(wrapper.text()).toContain('Your Plan')
    })

    it('shows --- for Your Plan when no projections calculated', () => {
      const yourPlanRow = wrapper.find('.your-plan')
      expect(yourPlanRow.text()).toContain('---')
    })
  })

  describe('Dropdown Options', () => {
    it('has neighborhood options', async () => {
      await wrapper.find('.add-rule').trigger('click')
      const neighborhoodSelect = wrapper.findAll('.inline-select')[0]
      const options = neighborhoodSelect.findAll('option')
      expect(options.length).toBeGreaterThan(1)
      expect(options[0].text()).toBe('any')
    })

    it('has zoning code options', async () => {
      await wrapper.find('.add-rule').trigger('click')
      const zoningSelect = wrapper.findAll('.inline-select')[1]
      const options = zoningSelect.findAll('option')
      expect(options.length).toBeGreaterThan(1)
      expect(options.some(o => o.text() === 'RH-2')).toBe(true)
    })

    it('has FZP height options', async () => {
      await wrapper.find('.add-rule').trigger('click')
      const heightSelect = wrapper.findAll('.inline-select')[2]
      const options = heightSelect.findAll('option')
      expect(options.length).toBeGreaterThan(1)
      expect(options.some(o => o.text() === '85 ft')).toBe(true)
    })
  })
})
